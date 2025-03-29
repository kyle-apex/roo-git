# Contributing to Roo Git

This document provides guidelines and information for developing the Roo Git VS Code extension.

## Project Structure

- `/src` - TypeScript source code for the extension
  - `extension.ts` - Main extension entry point
- `/webview` - React webview application
  - `/src` - React components and styles
  - `webpack.config.js` - Webpack configuration for bundling the webview
  - `tsconfig.json` - TypeScript configuration for the webview
- `/resources` - Static resources like icons
- `package.json` - Extension manifest and npm dependencies

## Development Workflow

1. **Setup**: Run `npm install` to install all dependencies
2. **Build**: Run `npm run compile` to build both the extension and webview
3. **Watch**: Run `npm run watch` to automatically rebuild on changes
4. **Debug**: Press F5 in VS Code to launch the extension in debug mode

## Architecture Overview

### Extension Side (TypeScript)

The extension is built using the VS Code Extension API. Key components:

- `RooGitViewProvider` - Manages the webview in the sidebar
- `activate` function - Entry point that registers the view provider and commands

### Webview Side (React)

The webview is a React application that communicates with the extension through the VS Code API:

- `App.tsx` - Main React component for the UI
- `index.tsx` - Entry point that initializes the React application
- Communication is done via `vscode.postMessage()` and message handlers

## Coding Guidelines

1. **TypeScript**: Use TypeScript for type safety
2. **React**: Follow React best practices and functional components
3. **VS Code API**: Refer to the [VS Code Extension API documentation](https://code.visualstudio.com/api)
4. **Naming Conventions**:
   - Use camelCase for variables and functions
   - Use PascalCase for classes and React components
   - Use kebab-case for file names

## Extension Features

The Roo Git extension provides a sidebar view for Git operations:

1. **Sidebar View**: Access Git operations from the activity bar
2. **Toggle**: Click the Git icon in the activity bar to show/hide the extension

## Testing

Before submitting changes, ensure:

1. The extension compiles without errors
2. The sidebar view displays correctly
3. The React webview loads and functions properly

## Building and Packaging

To create a VSIX package for distribution:

1. Install vsce: `npm install -g vsce`
2. Run: `vsce package`

This will generate a .vsix file that can be installed in VS Code.