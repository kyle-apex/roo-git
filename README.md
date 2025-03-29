# VS Code React Webview Extension

A Visual Studio Code extension that demonstrates how to create a webview using React and TypeScript.

## Features

- Creates a webview panel with React UI
- Demonstrates communication between the extension and webview
- Uses TypeScript for type safety
- Styled with CSS using VS Code's theme variables

## Development

### Prerequisites

- Node.js
- npm or yarn
- Visual Studio Code

### Setup

1. Clone the repository
2. Run `npm install` to install dependencies
3. Run `npm run compile` to build the extension and webview

### Running the Extension

1. Press F5 to open a new window with your extension loaded
2. Run the command "Show React Webview" from the Command Palette (Ctrl+Shift+P)
3. The webview panel should appear with the React UI

### Making Changes

- Extension code is in the `src` directory
- React webview code is in the `webview/src` directory
- After making changes to the extension code, restart the extension development host
- After making changes to the webview code, run `npm run compile:webview` and reload the webview

## How it Works

The extension creates a webview panel and loads the bundled React application into it. The React application can communicate with the extension using the VS Code API.

### Extension to Webview Communication

The extension can send messages to the webview using the `webview.postMessage()` method.

### Webview to Extension Communication

The webview can send messages to the extension using the `vscode.postMessage()` method, which is acquired through the `acquireVsCodeApi()` function.

## Building and Packaging

To build and package the extension:

```bash
npm run vscode:prepublish
```

This will compile both the extension and webview, and prepare the extension for packaging.