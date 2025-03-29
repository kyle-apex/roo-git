import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { exec } from "child_process";
import { promisify } from "util";
import {
  claimIssue,
  GitHubIssue,
  ClaimIssueResult,
  findReadyIssues,
  isGitRepository,
} from "./utils/github";

const execAsync = promisify(exec);

// Check if GitHub CLI is authenticated
async function checkGitHubAuth(): Promise<boolean> {
  try {
    const { stdout } = await execAsync("gh auth status");
    return stdout.includes("Logged in to");
  } catch (error) {
    // If the command fails, the user is not authenticated
    return false;
  }
}

export function activate(context: vscode.ExtensionContext) {
  console.log('Extension "roo-git" is now active!');

  // Register the sidebar webview provider
  const provider = new RooGitViewProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("roo-git-view", provider)
  );

  // Register the command to show the webview
  const disposable = vscode.commands.registerCommand(
    "roo-git.showWebview",
    () => {
      vscode.commands.executeCommand(
        "workbench.view.extension.roo-git-sidebar"
      );
    }
  );

  context.subscriptions.push(disposable);
}

/**
 * Manages the Roo Git webview in the sidebar
 */
class RooGitViewProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;
  private _extensionUri: vscode.Uri;
  private _authCheckInterval?: NodeJS.Timeout;
  private _issuePollingInterval?: NodeJS.Timeout;
  private _isAuthenticated: boolean = false;
  private _isPollingEnabled: boolean = true;
  private _pollingIntervalSeconds: number = 10;
  private _repository: string = "";

  constructor(extensionUri: vscode.Uri) {
    this._extensionUri = extensionUri;

    // Load configuration
    this._loadConfiguration();

    // Listen for configuration changes
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (
        e.affectsConfiguration("roo-git.issuePollingIntervalSeconds") ||
        e.affectsConfiguration("roo-git.enableIssuePolling") ||
        e.affectsConfiguration("roo-git.repository")
      ) {
        this._loadConfiguration();
        this._restartIssuePolling();
      }
    });
  }

  private _loadConfiguration(): void {
    const config = vscode.workspace.getConfiguration("roo-git");
    this._pollingIntervalSeconds = config.get(
      "issuePollingIntervalSeconds",
      10
    );
    this._isPollingEnabled = config.get("enableIssuePolling", true);
    this._repository = config.get("repository", "");
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      // Enable JavaScript in the webview
      enableScripts: true,
      // Restrict the webview to only load resources from the extension's directory
      localResourceRoots: [
        vscode.Uri.joinPath(this._extensionUri, "webview/dist"),
      ],
    };

    // Set the webview's initial html content
    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    // Handle messages from the webview
    webviewView.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case "alert":
          vscode.window.showInformationMessage(message.text);
          return;
        case "checkAuth":
          this._checkAndUpdateAuthStatus();
          return;
        case "claimIssue":
          try {
            const issue = message.issue as GitHubIssue;
            const result = await claimIssue(issue, this._repository);

            // Send the result back to the webview
            if (this._view) {
              this._view.webview.postMessage({
                command: "claimIssueResult",
                result,
              });
            }

            // Show a notification based on the result
            if (result.success) {
              vscode.window.showInformationMessage(
                `Successfully claimed issue #${issue.number} and created branch '${result.branchName}'`
              );
            } else {
              vscode.window.showErrorMessage(
                `Failed to claim issue: ${result.error}`
              );
            }
          } catch (error) {
            vscode.window.showErrorMessage(
              `Error claiming issue: ${
                error instanceof Error ? error.message : String(error)
              }`
            );

            // Send error back to webview
            if (this._view) {
              this._view.webview.postMessage({
                command: "claimIssueResult",
                result: {
                  success: false,
                  branchName: "",
                  error: String(error),
                },
              });
            }
          }
          return;
      }
    });

    // Start polling for GitHub authentication status
    this._startAuthPolling();

    // Start polling for GitHub issues
    this._startIssuePolling();
  }

  private async _checkAndUpdateAuthStatus(): Promise<void> {
    const isAuthenticated = await checkGitHubAuth();

    // Only send update if authentication status has changed or it's the first check
    if (this._isAuthenticated !== isAuthenticated || this._view?.visible) {
      this._isAuthenticated = isAuthenticated;

      if (this._view) {
        this._view.webview.postMessage({
          command: "authStatus",
          isAuthenticated,
        });
      }
    }
  }

  private _startAuthPolling(): void {
    // Clear any existing interval
    if (this._authCheckInterval) {
      clearInterval(this._authCheckInterval);
    }

    // Check immediately
    this._checkAndUpdateAuthStatus();

    // Then check every 5 seconds
    this._authCheckInterval = setInterval(() => {
      this._checkAndUpdateAuthStatus();
    }, 5000);
  }

  public dispose(): void {
    if (this._authCheckInterval) {
      clearInterval(this._authCheckInterval);
    }

    if (this._issuePollingInterval) {
      clearInterval(this._issuePollingInterval);
    }
  }

  /**
   * Starts polling for GitHub issues with "Ready for Plan" label
   */
  private _startIssuePolling(): void {
    // Clear any existing interval
    if (this._issuePollingInterval) {
      clearInterval(this._issuePollingInterval);
    }

    // Only start polling if enabled
    if (!this._isPollingEnabled) {
      console.log("Issue polling is disabled");
      return;
    }

    console.log(
      `Starting issue polling with interval: ${this._pollingIntervalSeconds} seconds`
    );

    // Check immediately
    this._checkForReadyIssues();

    // Then check at the configured interval
    this._issuePollingInterval = setInterval(() => {
      this._checkForReadyIssues();
    }, this._pollingIntervalSeconds * 1000);
  }

  /**
   * Restarts the issue polling with updated configuration
   */
  private _restartIssuePolling(): void {
    console.log("Restarting issue polling with updated configuration");
    this._startIssuePolling();
  }

  /**
   * Checks for GitHub issues with "Ready for Plan" label and without "Claimed by Agent" label
   */
  private async _checkForReadyIssues(): Promise<void> {
    try {
      // Only proceed if authenticated
      if (!this._isAuthenticated) {
        return;
      }

      // If no repository is configured, check if we're in a git repository
      if (!this._repository) {
        const inGitRepo = await isGitRepository();
        if (!inGitRepo) {
          console.error(
            "Not in a git repository and no repository configured in settings. " +
              "Please configure the repository in VS Code settings (roo-git.repository)."
          );

          // Notify the webview if it's open
          if (this._view) {
            this._view.webview.postMessage({
              command: "error",
              message:
                "Not in a git repository. Please configure the repository in settings.",
            });
          }

          return;
        }
      }

      const issues = await findReadyIssues(this._repository);

      if (issues.length > 0) {
        console.log(`Found ${issues.length} ready issues`);

        // Process the first issue
        const issue = issues[0];
        console.log(`Processing issue #${issue.number}: ${issue.title}`);

        // Claim the issue
        await this._processReadyIssue(issue);
      }
    } catch (error) {
      console.error("Error checking for ready issues:", error);
    }
  }

  /**
   * Processes a ready issue by claiming it
   * @param issue The issue to process
   */
  private async _processReadyIssue(issue: GitHubIssue): Promise<void> {
    try {
      console.log(`Claiming issue #${issue.number}`);
      const result = await claimIssue(issue, this._repository);

      if (result.success) {
        vscode.window.showInformationMessage(
          `Successfully claimed issue #${issue.number} and created branch '${result.branchName}'`
        );

        // Notify the webview if it's open
        if (this._view) {
          this._view.webview.postMessage({
            command: "issueClaimed",
            issue,
            result,
          });
        }
      } else {
        console.error(`Failed to claim issue #${issue.number}:`, result.error);
      }
    } catch (error) {
      console.error(`Error processing issue #${issue.number}:`, error);
    }
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    // Get the local path to the bundled React app
    const distPath = vscode.Uri.joinPath(this._extensionUri, "webview", "dist");
    const bundlePath = vscode.Uri.joinPath(distPath, "bundle.js");

    // And the uri we use to load this script in the webview
    const bundleUri = webview.asWebviewUri(bundlePath);

    // Use a nonce to only allow specific scripts to be run
    const nonce = getNonce();

    return `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
        <title>Roo Git</title>
      </head>
      <body>
        <div id="root"></div>
        <script nonce="${nonce}" src="${bundleUri}"></script>
      </body>
      </html>`;
  }
}

function getNonce() {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

// This method is called when your extension is deactivated
export function deactivate() {
  // The provider's dispose method will be called automatically when the extension is deactivated
}
