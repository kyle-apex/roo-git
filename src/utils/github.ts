import { exec } from "child_process";
import { promisify } from "util";
import * as vscode from "vscode";

// Promisify exec with options
const execPromise = promisify(exec);

// Wrapper around execPromise that uses the workspace folder as the cwd if not specified
async function execAsync(
  command: string,
  options: { cwd?: string } = {}
): Promise<{ stdout: string; stderr: string }> {
  // If cwd is not specified, try to use the first workspace folder
  if (
    !options.cwd &&
    vscode.workspace.workspaceFolders &&
    vscode.workspace.workspaceFolders.length > 0
  ) {
    options.cwd = vscode.workspace.workspaceFolders[0].uri.fsPath;
  }

  console.log(
    `Executing command: ${command} in directory: ${
      options.cwd || process.cwd()
    }`
  );
  return execPromise(command, options);
}

/**
 * Interface representing a GitHub issue
 */
export interface GitHubIssue {
  number: number;
  title: string;
  url: string;
  labels?: string[];
  // Other properties that might be needed
}

/**
 * Result of the claimIssue operation
 */
export interface ClaimIssueResult {
  success: boolean;
  branchName: string;
  error?: string;
}

/**
 * Converts an issue title to a valid branch name in kebab-case
 * @param issueNumber The issue number
 * @param issueTitle The issue title
 * @returns A branch name in the format "issue-{number}-{kebab-case-title}"
 */
function convertToBranchName(issueNumber: number, issueTitle: string): string {
  // Convert to lowercase
  const lowercaseTitle = issueTitle.toLowerCase();

  // Replace spaces and special characters with hyphens
  const kebabCase = lowercaseTitle
    .replace(/[^\w\s-]/g, "") // Remove special characters except hyphens
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with a single hyphen
    .trim() // Remove leading/trailing spaces
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens

  // Add issue number prefix
  return `issue-${issueNumber}-${kebabCase}`;
}

/**
 * Executes a GitHub CLI command
 * @param command The command to execute
 * @param repository Optional repository in the format "owner/repo"
 * @returns The stdout of the command
 * @throws Error if the command fails
 */
async function executeGitHubCommand(
  command: string,
  repository?: string
): Promise<string> {
  try {
    // Add repository flag if provided
    const fullCommand = repository ? `${command} -R ${repository}` : command;

    // Use the workspace folder as the cwd (handled by execAsync)
    const { stdout } = await execAsync(fullCommand);
    return stdout.trim();
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(
        `Failed to execute command: ${command}. Error: ${error.message}`
      );
    }
    throw error;
  }
}

/**
 * Searches for GitHub issues with specific labels
 *
 * @param includeLabels Labels that issues must have
 * @param excludeLabels Labels that issues must not have
 * @param limit Maximum number of issues to return
 * @param repository Repository in the format "owner/repo"
 * @returns A promise that resolves to an array of GitHub issues
 */
/**
 * Checks if the current directory is a git repository
 * @returns True if the current directory is a git repository, false otherwise
 */
export async function isGitRepository(): Promise<boolean> {
  try {
    // Log the current working directory to help diagnose issues
    console.log("Current working directory:", process.cwd());

    // Try multiple git commands to check if we're in a git repository
    // Some commands might work better in different environments
    try {
      // First try: Check if .git directory exists
      console.log("Executing: git rev-parse --git-dir");
      const { stdout: gitDir } = await execAsync("git rev-parse --git-dir");
      console.log("git rev-parse --git-dir result:", gitDir.trim());
      if (gitDir.trim()) {
        return true;
      }
    } catch (e) {
      console.error("git rev-parse --git-dir failed:", e);
      // Try next method
    }

    try {
      // Second try: Check if we're inside a work tree
      console.log("Executing: git rev-parse --is-inside-work-tree");
      const { stdout: isWorkTree } = await execAsync(
        "git rev-parse --is-inside-work-tree"
      );
      console.log(
        "git rev-parse --is-inside-work-tree result:",
        isWorkTree.trim()
      );
      if (isWorkTree.trim() === "true") {
        return true;
      }
    } catch (e) {
      console.error("git rev-parse --is-inside-work-tree failed:", e);
      // Try next method
    }

    try {
      // Third try: Try to get the current branch
      console.log("Executing: git branch --show-current");
      const { stdout: branch } = await execAsync("git branch --show-current");
      console.log("git branch --show-current result:", branch.trim());
      if (branch.trim()) {
        return true;
      }
    } catch (e) {
      console.error("git branch --show-current failed:", e);
    }

    // If all methods failed, we're not in a git repository
    console.log("All git commands failed, returning false");
    return false;
  } catch (error) {
    console.error("Unexpected error checking if in git repository:", error);
    return false;
  }
}

export async function searchIssues(
  includeLabels: string[] = [],
  excludeLabels: string[] = [],
  limit: number = 10,
  repository?: string
): Promise<GitHubIssue[]> {
  try {
    // Check if we're in a git repository or if a repository is specified
    const inGitRepo = await isGitRepository();
    if (!repository && !inGitRepo) {
      throw new Error(
        "Not in a git repository. Please specify a repository in the settings (roo-git.repository) or run from within a git repository."
      );
    }

    // Build the command with label flags for include labels
    let command = `gh issue list --json number,title,url,labels`;

    // Add label filters for include labels
    for (const label of includeLabels) {
      command += ` --label "${label}"`;
    }

    // We'll fetch all issues with the include labels
    // and then filter out those with exclude labels in our code
    // This avoids issues with complex search queries

    // Add limit - we might need to fetch more than the limit to account for filtering
    const fetchLimit =
      excludeLabels.length > 0 ? Math.max(limit * 2, 30) : limit;
    command += ` --limit ${fetchLimit}`;

    // Execute the command
    const output = await executeGitHubCommand(command, repository);

    // Parse the JSON output
    const issues: Array<{
      number: number;
      title: string;
      url: string;
      labels: Array<{ name: string }>;
    }> = JSON.parse(output);

    // Filter out issues with excluded labels
    let filteredIssues = issues;
    if (excludeLabels.length > 0) {
      filteredIssues = issues.filter((issue) => {
        const issueLabels = issue.labels.map((label) => label.name);
        // Keep the issue if it doesn't have any of the excluded labels
        return !excludeLabels.some((excludeLabel) =>
          issueLabels.includes(excludeLabel)
        );
      });
    }

    // Limit the results to the requested limit
    filteredIssues = filteredIssues.slice(0, limit);

    // Convert to GitHubIssue format
    return filteredIssues.map((issue) => ({
      number: issue.number,
      title: issue.title,
      url: issue.url,
      labels: issue.labels.map((label) => label.name),
    }));
  } catch (error) {
    console.error("Error searching for issues:", error);
    return [];
  }
}

/**
 * Searches for issues with "Ready for Plan" label and without "Claimed by Agent" label
 *
 * @param repository Repository in the format "owner/repo"
 * @returns A promise that resolves to an array of GitHub issues
 */
export async function findReadyIssues(
  repository?: string
): Promise<GitHubIssue[]> {
  return searchIssues(["Ready for Plan"], ["Claimed by Agent"], 10, repository);
}

/**
 * Adds a label to an issue, creating the label first if it doesn't exist
 *
 * @param issueNumber The issue number
 * @param labelName The name of the label to add
 * @param repository Optional repository in the format "owner/repo"
 * @param color Optional color for the label if it needs to be created (hex without #)
 * @param description Optional description for the label if it needs to be created
 * @returns A promise that resolves when the operation is complete
 */
async function addLabelToIssue(
  issueNumber: number,
  labelName: string,
  repository?: string,
  color: string = "0E8A16", // Default to green
  description: string = ""
): Promise<void> {
  try {
    // Try to add the label
    await executeGitHubCommand(
      `gh issue edit ${issueNumber} --add-label "${labelName}"`,
      repository
    );
  } catch (error) {
    // Check if the error is because the label doesn't exist
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (
      errorMessage.includes(`'${labelName}' not found`) ||
      errorMessage.includes(`"${labelName}" not found`)
    ) {
      console.log(`Label '${labelName}' not found. Creating it...`);

      // Create the label with the specified color and description
      await executeGitHubCommand(
        `gh label create "${labelName}" --color ${color}${
          description ? ` --description "${description}"` : ""
        }`,
        repository
      );

      // Try adding the label again
      await executeGitHubCommand(
        `gh issue edit ${issueNumber} --add-label "${labelName}"`,
        repository
      );
    } else {
      // If it's a different error, rethrow it
      throw error;
    }
  }
}

/**
 * Claims an issue by:
 * 1. Adding the "Claimed by Agent" label
 * 2. Creating a new branch based on the issue title
 * 3. Adding a "Branch: branch-name" label
 *
 * @param issue The GitHub issue to claim
 * @param repository Repository in the format "owner/repo"
 * @returns A promise that resolves to the result of the operation
 */
export async function claimIssue(
  issue: GitHubIssue,
  repository?: string
): Promise<ClaimIssueResult> {
  try {
    // Check if we're in a git repository or if a repository is specified
    const inGitRepo = await isGitRepository();
    if (!repository && !inGitRepo) {
      throw new Error(
        "Not in a git repository. Please specify a repository in the settings (roo-git.repository) or run from within a git repository."
      );
    }

    // 1. Add "Claimed by Agent" label
    await addLabelToIssue(
      issue.number,
      "Claimed by Agent",
      repository,
      "0E8A16", // Green color
      "Issue claimed by Roo agent"
    );

    // 2. Create branch name from issue title
    const branchName = convertToBranchName(issue.number, issue.title);

    // 3. Create the branch
    // Note: This requires a git repository context
    if (inGitRepo) {
      try {
        await executeGitHubCommand(`git checkout -b ${branchName}`);
      } catch (error) {
        console.warn(`Could not create branch: ${error}`);
        // Continue anyway - we'll just add the label
      }
    } else {
      console.log(`Skipping branch creation as we're not in a git repository`);
    }

    // 4. Add "Branch: branch-name" label
    const branchLabel = `Branch: ${branchName}`;
    await addLabelToIssue(
      issue.number,
      branchLabel,
      repository,
      "0075CA", // Blue color
      "Branch created for this issue"
    );

    // 5. Return success and branch name
    return { success: true, branchName };
  } catch (error) {
    // Handle errors
    return {
      success: false,
      branchName: "",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
