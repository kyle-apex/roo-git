import { exec } from 'child_process';
import * as vscode from 'vscode';

/**
 * Interface representing the structure of issue data returned by the gh CLI.
 */
interface GitHubIssue {
    number: number;
    title: string;
    state: 'OPEN' | 'CLOSED';
    url: string;
    assignee: { login: string } | null;
    createdAt: string;
    updatedAt: string;
    closedAt: string | null;
    body: string;
    // Add other fields returned by --json if needed
}

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
        vscode.window.showInformationMessage('Open a terminal and run `gh auth login`');
    }
}

/**
 * Fetches issues from a GitHub repository using the `gh` CLI, optionally filtering by label.
 * @param owner The repository owner.
 * @param repo The repository name.
 * @param label Optional label to filter issues by.
 * @returns A promise that resolves to an array of issues, or undefined if an error occurs.
 */
async function fetchGitHubIssuesGh(owner: string, repo: string, label?: string): Promise<GitHubIssue[] | undefined> {
    if (!await isGhInstalled()) {
        await promptInstallGh();
        return undefined;
    }

    if (!await isGhAuthenticated()) {
        await promptGhLogin();
        return undefined;
    }

    return new Promise<GitHubIssue[]>((resolve, reject) => {
        // Base command
        let command = `gh issue list -R ${owner}/${repo} --json number,title,state,url,assignee,createdAt,updatedAt,closedAt,body`;

        // Add label filter if provided
        if (label) {
            // Ensure the label is properly quoted to handle spaces or special characters
            const escapedLabel = label.replace(/"/g, '\\"');
            command += ` --label "${escapedLabel}"`;
        }

        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`exec error: ${error}`);
                if (stderr.includes('not found')) {
                    reject(new Error(`Repository ${owner}/${repo} not found.`));
                } else if (stderr.includes('no issues match')) {
                    // Handle case where no issues match the filter
                    resolve([]);
                }
                 else {
                    reject(new Error(`Failed to execute gh command: ${stderr || error.message}`));
                }
                return;
            }
            try {
                const issues: GitHubIssue[] = JSON.parse(stdout);
                resolve(issues);
            } catch (parseError) {
                console.error(`Error parsing JSON: ${parseError}`);
                reject(new Error('Failed to parse gh output.'));
            }
        });
    });
}

/**
 * Wrapper function to list issues, handling errors and optional label filtering.
 * @param owner The repository owner.
 * @param repo The repository name.
 * @param label Optional label to filter issues by.
 * @returns A promise that resolves to an array of issues, or undefined if an error occurs.
 */
export async function listIssues(owner: string, repo: string, label?: string): Promise<GitHubIssue[] | undefined> {
    try {
        return await fetchGitHubIssuesGh(owner, repo, label);
    } catch (error) {
        // Type assertion to Error or handle unknown
        const message = error instanceof Error ? error.message : 'An unknown error occurred';
        vscode.window.showErrorMessage(message);
        return undefined;
    }
}