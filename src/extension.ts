import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { exec } from "child_process";
import { promisify } from "util";

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
  private _isAuthenticated: boolean = false;

  constructor(extensionUri: vscode.Uri) {
    this._extensionUri = extensionUri;
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
    webviewView.webview.onDidReceiveMessage((message) => {
      switch (message.command) {
        case "alert":
          vscode.window.showInformationMessage(message.text);
          return;
        case "checkAuth":
          this._checkAndUpdateAuthStatus();
          return;
      }
    });

    // Start polling for GitHub authentication status
    this._startAuthPolling();
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
