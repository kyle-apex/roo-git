import { exec } from 'child_process';
import * as vscode from 'vscode';

/**
 * Checks if the GitHub CLI (`gh`) is installed.
 * @returns A promise that resolves to true if `gh` is installed, false otherwise.
 */
async function isGhInstalled(): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
        exec('gh --version', (error) => {
            resolve(!error);
        });
    });
}

/**
 * Checks if the user is authenticated with GitHub via the `gh` CLI.
 * @returns A promise that resolves to true if authenticated, false otherwise.
 */
async function isGhAuthenticated(): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
        exec('gh auth status', (error) => {
            resolve(!error); // If there's no error, we are authenticated
        });
    });
}

/**
 *  Prompts user to install gh cli
 */
async function promptInstallGh() {
    const installGh = 'Install GitHub CLI';
    const result = await vscode.window.showErrorMessage(
        'The GitHub CLI (gh) is not installed. Please install it to use this feature.',
        installGh
    );
    if (result === installGh) {
        vscode.env.openExternal(vscode.Uri.parse('https://cli.github.com/'));
    }
}

/**
 * Prompts the user to authenticate with GitHub using the `gh` CLI.
 */
async function promptGhLogin() {
    const login = 'Run `gh auth login`';
    const result = await vscode.window.showInformationMessage(
        'You are not authenticated with GitHub. Please run `gh auth login` in your terminal.',
        login
    );
    if (result === login) {
        // Ideally, we'd open a terminal and run the command for them, but VS Code
        // doesn't directly support pre-filling terminal input.  We'll just
        // guide them.
        vscode.window.showInformationMessage('Open a terminal and run `gh auth login`');
    }
}

/**
 * Fetches issues from a GitHub repository using the `gh` CLI.
 * @param owner The repository owner.
 * @param repo The repository name.
 * @returns A promise that resolves to an array of issues, or undefined if an error occurs.
 */
export async function fetchGitHubIssuesGh(owner: string, repo: string): Promise<unknown[] | undefined> {
    if (!await isGhInstalled()) {
        await promptInstallGh();
        return undefined;
    }

    if (!await isGhAuthenticated()) {
        await promptGhLogin();
        return undefined;
    }

    return new Promise<unknown[]>((resolve, reject) => {
        const command = `gh issue list -R ${owner}/${repo} --json number,title,state,url,assignee,createdAt,updatedAt,closedAt,body`;
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`exec error: ${error}`);
                // Check for specific errors, like repo not found
                if (stderr.includes('not found')) {
                    reject(new Error(`Repository ${owner}/${repo} not found.`));
                } else {
                    reject(error);
                }
                return;
            }
            try {
                const issues = JSON.parse(stdout);
                resolve(issues);
            } catch (parseError) {
                console.error(`Error parsing JSON: ${parseError}`);
                reject(new Error('Failed to parse gh output.'));
            }
        });
    });
}

/**
 * Wrapper that handles errors
 */
export async function listIssues(owner: string, repo: string): Promise<unknown[] | undefined> {
    try {
        return await fetchGitHubIssuesGh(owner, repo);
    } catch (error: unknown) {
        if (error instanceof Error) {
            vscode.window.showErrorMessage(error.message);
        } else {
            vscode.window.showErrorMessage('An unknown error occurred.');
        }
        return undefined;
    }
}