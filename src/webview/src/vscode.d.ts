// Export to make this an external module
export {};

interface GitHubIssue {
    number: number;
    title: string;
    state: 'OPEN' | 'CLOSED';
    body?: string;
    url: string;
    assignee: { login: string } | null;
    createdAt: string;
    updatedAt: string;
    closedAt: string | null;
}

interface VSCodeMessage {
    command: string;
    issues?: GitHubIssue[];
    error?: string;
}

declare const vscode: {
    postMessage(message: VSCodeMessage): void;
};

declare global {
    interface Window {
        addEventListener(type: 'message', listener: (event: MessageEvent) => void): void;
        removeEventListener(type: 'message', listener: (event: MessageEvent) => void): void;
    }
}