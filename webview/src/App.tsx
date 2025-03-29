import * as React from 'react';
import './App.css';

interface AppProps {
  vscode: {
    postMessage: (message: any) => void;
    getState: () => any;
    setState: (state: any) => void;
  };
}

const App: React.FC<AppProps> = ({ vscode }) => {
  const [count, setCount] = React.useState(0);

  const handleClick = () => {
    setCount(count + 1);
    // Send a message to the extension
    vscode.postMessage({
      command: 'alert',
      text: `Count is now: ${count + 1}`
    });
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Roo Git</h1>
      </header>
      <main className="app-content">
        <p>Git operations made easy!</p>
        <div className="counter">
          <p>You clicked the button {count} times</p>
          <button onClick={handleClick}>Click me</button>
        </div>
      </main>
    </div>
  );
};

export default App;