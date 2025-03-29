# Roo Git

A Visual Studio Code extension for Git operations with a convenient sidebar interface.

## Features

- Sidebar view for Git operations
- Toggle visibility with the Git icon in the activity bar
- React-based UI for a modern experience
- TypeScript for type safety
- Styled with CSS using VS Code's theme variables

## Installation

You can install this extension directly from the VS Code marketplace or by downloading the VSIX file and installing it manually.

### Manual Installation

1. Download the VSIX file from the releases page
2. Open VS Code
3. Go to Extensions view (Ctrl+Shift+X)
4. Click on the "..." menu in the top-right of the Extensions view
5. Select "Install from VSIX..." and choose the downloaded file

## Usage

1. Click on the Git icon in the activity bar to open the Roo Git sidebar
2. Use the interface to perform Git operations
3. Toggle the sidebar by clicking the Git icon again

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
2. The Roo Git icon should appear in the activity bar
3. Click on the icon to open the sidebar view

### Making Changes

- Extension code is in the `src` directory
- React webview code is in the `webview/src` directory
- After making changes to the extension code, restart the extension development host
- After making changes to the webview code, run `npm run compile:webview` and reload the webview

For more detailed development guidelines, see [CONTRIBUTING.md](CONTRIBUTING.md).

## How it Works

The extension creates a webview in the sidebar and loads the bundled React application into it. The React application can communicate with the extension using the VS Code API.

### Extension to Webview Communication

The extension can send messages to the webview using the `webview.postMessage()` method.

### Webview to Extension Communication

The webview can send messages to the extension using the `vscode.postMessage()` method, which is acquired through the `acquireVsCodeApi()` function.

## Building and Packaging

To build and package the extension:

```bash
npm run vscode:prepublish
vsce package
```

This will compile both the extension and webview, and create a VSIX file that can be installed in VS Code.

## License

This project is licensed under the MIT License - see the LICENSE file for details.