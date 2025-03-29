import * as React from "react";
import "./App.css";

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

  // Listen for messages from the extension
  React.useEffect(() => {
    const messageListener = (event: MessageEvent) => {
      const message = event.data;

      switch (message.command) {
        case "authStatus":
          setIsAuthenticated(message.isAuthenticated);
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
        <p>Git operations made easy!</p>
      </main>
    </div>
  );
};

export default App;
