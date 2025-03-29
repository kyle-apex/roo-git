import * as vscode from 'vscode';
import { listIssues } from './utils/gh';

class GitHubIssuesViewProvider implements vscode.WebviewViewProvider {
    private _view?: vscode.WebviewView;

    constructor(private readonly _extensionUri: vscode.Uri) {}

    public resolveWebviewView(webviewView: vscode.WebviewView) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getWebviewContent(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(async message => {
            switch (message.command) {
                case 'listIssues':
                    try {
                        const issues = await listIssues(message.owner, message.repo, message.label);
                        webviewView.webview.postMessage({
                            command: 'showIssues',
                            issues: issues || []
                        });
                    } catch (error) {
                        webviewView.webview.postMessage({
                            command: 'error',
                            error: error instanceof Error ? error.message : 'Failed to fetch issues'
                        });
                    }
                    break;
                case 'openIssue':
                    if (message.url) {
                        vscode.env.openExternal(vscode.Uri.parse(message.url));
                    }
                    break;
            }
        });
    }

    private _getWebviewContent(webview: vscode.Webview) {
        // Get the URI to the React webview bundle
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'out', 'webview', 'main.js')
        );

        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>GitHub Issues Viewer</title>
        </head>
        <body>
            <div id="root"></div>
            <script src="${scriptUri}"></script>
        </body>
        </html>
    `;
    }
}

export function activate(context: vscode.ExtensionContext) {
    const provider = new GitHubIssuesViewProvider(context.extensionUri);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('githubIssuesView', provider)
    );
}