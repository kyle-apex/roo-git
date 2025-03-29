import * as React from "react";
import "./App.css";

// Interface for GitHub issue
interface GitHubIssue {
  number: number;
  title: string;
  url: string;
}

// Interface for claim issue result
interface ClaimIssueResult {
  success: boolean;
  branchName: string;
  error?: string;
}

interface AppProps {
  vscode: {
    postMessage: (message: any) => void;
    getState: () => any;
    setState: (state: any) => void;
  };
}

const App: React.FC<AppProps> = ({ vscode }) => {
  const [isAuthenticated, setIsAuthenticated] = React.useState<boolean | null>(
    null
  );
  const [issueNumber, setIssueNumber] = React.useState<string>("");
  const [issueTitle, setIssueTitle] = React.useState<string>("");
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [claimResult, setClaimResult] = React.useState<ClaimIssueResult | null>(
    null
  );

  // Listen for messages from the extension
  React.useEffect(() => {
    const messageListener = (event: MessageEvent) => {
      const message = event.data;

      switch (message.command) {
        case "authStatus":
          setIsAuthenticated(message.isAuthenticated);
          break;
        case "claimIssueResult":
          setClaimResult(message.result);
          setIsLoading(false);
          break;
      }
    };

    window.addEventListener("message", messageListener);

    // Request authentication status on mount
    vscode.postMessage({ command: "checkAuth" });

    return () => {
      window.removeEventListener("message", messageListener);
    };
  }, [vscode]);

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!issueNumber || !issueTitle) {
      return;
    }

    // Reset previous result
    setClaimResult(null);
    setIsLoading(true);

    // Create issue object
    const issue: GitHubIssue = {
      number: parseInt(issueNumber, 10),
      title: issueTitle,
      url: `https://github.com/user/repo/issues/${issueNumber}`, // This is a placeholder URL
    };

    // Send message to extension to claim the issue
    vscode.postMessage({
      command: "claimIssue",
      issue,
    });
  };

  // Loading state while checking authentication
  if (isAuthenticated === null) {
    return (
      <div className="app">
        <header className="app-header">
          <h1>Roo Git</h1>
        </header>
        <main className="app-content">
          <p>Checking GitHub authentication status...</p>
        </main>
      </div>
    );
  }

  // Not authenticated state
  if (!isAuthenticated) {
    return (
      <div className="app">
        <header className="app-header">
          <h1>Roo Git</h1>
        </header>
        <main className="app-content">
          <div className="auth-instructions">
            <h2>GitHub Authentication Required</h2>
            <p>You need to authenticate with GitHub to use this extension.</p>
            <div className="instructions">
              <h3>Instructions:</h3>
              <ol>
                <li>Open a terminal</li>
                <li>
                  Run the command: <code>gh auth login</code>
                </li>
                <li>Follow the prompts to authenticate</li>
              </ol>
              <p className="note">
                The extension will automatically detect when you've successfully
                authenticated.
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Authenticated state
  return (
    <div className="app">
      <header className="app-header">
        <h1>Roo Git</h1>
      </header>
      <main className="app-content">
        <p>✅ Successfully authenticated with GitHub!</p>

        <div className="claim-issue-section">
          <h2>Claim an Issue</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="issueNumber">Issue Number:</label>
              <input
                type="number"
                id="issueNumber"
                value={issueNumber}
                onChange={(e) => setIssueNumber(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="issueTitle">Issue Title:</label>
              <input
                type="text"
                id="issueTitle"
                value={issueTitle}
                onChange={(e) => setIssueTitle(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <button type="submit" disabled={isLoading}>
              {isLoading ? "Claiming..." : "Claim Issue"}
            </button>
          </form>

          {claimResult && (
            <div
              className={`claim-result ${
                claimResult.success ? "success" : "error"
              }`}
            >
              {claimResult.success ? (
                <div>
                  <p>✅ Successfully claimed issue #{issueNumber}!</p>
                  <p>
                    Created branch: <code>{claimResult.branchName}</code>
                  </p>
                  <p>Added labels:</p>
                  <ul>
                    <li>Claimed by Agent</li>
                    <li>Branch: {claimResult.branchName}</li>
                  </ul>
                </div>
              ) : (
                <div>
                  <p>❌ Failed to claim issue: {claimResult.error}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
