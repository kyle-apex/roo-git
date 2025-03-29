import * as React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// Get the VS Code API
declare global {
  interface Window {
    acquireVsCodeApi: () => {
      postMessage: (message: any) => void;
      getState: () => any;
      setState: (state: any) => void;
    };
  }
}

// Get VS Code API
const vscode = window.acquireVsCodeApi();

// Create root for React 18+
const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element not found');

const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App vscode={vscode} />
  </React.StrictMode>
);