# Roo Code Guidelines for Roo Git Extension

This document provides specific guidelines for Roo Code when working with the Roo Git extension project.

## Project Overview

Roo Git is a VS Code extension that provides a sidebar interface for Git operations. It uses TypeScript for the extension logic and React for the webview UI.

## Key Files and Their Purposes

- `src/extension.ts`: Main extension entry point that registers the sidebar view and commands
- `webview/src/App.tsx`: Main React component for the sidebar UI
- `package.json`: Extension manifest that defines the extension's name, commands, and sidebar view
- `resources/icon.svg`: Icon used in the activity bar for the extension

## Development Workflow Rules

1. **Always compile before testing**: Run `npm run compile` to build both the extension and webview
2. **Extension activation**: The extension activates when the sidebar view is opened
3. **Webview communication**: Use the VS Code API for communication between the extension and webview

## Code Modification Guidelines

### When modifying the extension (TypeScript):

1. Maintain the `RooGitViewProvider` class structure for the sidebar webview
2. Keep the extension activation logic in the `activate` function
3. Register any new commands in the `activate` function and add them to the `package.json` contributes section
4. Use the VS Code API for UI interactions and Git operations

### When modifying the webview (React):

1. Keep the React component structure with the main `App` component
2. Use the `vscode.postMessage()` method for sending messages to the extension
3. Handle incoming messages from the extension in the appropriate event listeners
4. Follow React best practices with functional components and hooks

## Testing Rules

1. Test the extension by pressing F5 in VS Code to launch a new window with the extension
2. Verify that the sidebar icon appears in the activity bar
3. Test opening and closing the sidebar by clicking the icon
4. Test any UI interactions in the webview

## Common Pitfalls to Avoid

1. **Webview path resolution**: Always use `webview.asWebviewUri()` to convert local paths to webview-accessible URIs
2. **Message handling**: Ensure message handlers in both the extension and webview match the expected message format
3. **State persistence**: Use the VS Code state API for persisting state between sessions
4. **Resource disposal**: Always dispose of resources when they're no longer needed

## Extension-Specific Knowledge

1. The sidebar view is registered with the ID `roo-git-view` in the `roo-git-sidebar` container
2. The extension uses the Git icon in the activity bar
3. The webview is implemented using React and bundled with webpack
4. Communication between the extension and webview uses the VS Code messaging API

## Debugging Tips

1. Use `console.log()` in the extension code to log to the VS Code Developer Tools console
2. Use `console.log()` in the webview code to log to the webview's console (accessible via Developer Tools)
3. Check the Output panel in VS Code for extension activation logs
4. Use the VS Code debugger to set breakpoints in the extension code

By following these guidelines, Roo Code can effectively understand and develop on the Roo Git extension project.