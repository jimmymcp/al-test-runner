import * as vscode from 'vscode';

/**
 * Options for executing PowerShell commands in the terminal
 */
export interface TerminalExecutionOptions {
	/** Path to the working directory */
	workingDirectory: string | undefined;
	/** Command to execute before the main command */
	preCommand?: string;
	/** Command to execute after the main command */
	postCommand?: string;
	/** Callback invoked for each chunk of output data (requires shell integration) */
	onOutput?: (data: string) => void;
	/** Whether to show the terminal and preserve focus */
	showTerminal?: boolean;
}

/**
 * Waits for shell integration to become available on a terminal
 * @param terminal The terminal to wait for shell integration on
 * @param timeoutMs Maximum time to wait in milliseconds (default: 3000)
 * @returns The TerminalShellIntegration if available, undefined if timeout expires
 */
export async function waitForShellIntegration(
	terminal: vscode.Terminal,
	timeoutMs: number = 3000
): Promise<vscode.TerminalShellIntegration | undefined> {
	return new Promise((resolve) => {
		// Check if already available
		if (terminal.shellIntegration) {
			resolve(terminal.shellIntegration);
			return;
		}

		// Set up timeout
		const timeout = setTimeout(() => {
			disposable.dispose();
			resolve(undefined);
		}, timeoutMs);

		// Listen for shell integration activation
		const disposable = vscode.window.onDidChangeTerminalShellIntegration(({ terminal: eventTerminal, shellIntegration }) => {
			if (eventTerminal === terminal) {
				clearTimeout(timeout);
				disposable.dispose();
				resolve(shellIntegration);
			}
		});
	});
}

/**
 * Executes a PowerShell command using shell integration with fallback to sendText
 * @param terminal The terminal to execute the command in
 * @param command The PowerShell command to execute
 * @param options Execution options including working directory, pre/post commands, and output callback
 */
export async function executeWithShellIntegration(
	terminal: vscode.Terminal,
	command: string,
	options: TerminalExecutionOptions
): Promise<void> {
	// Show terminal if requested (preserves focus with true parameter)
	if (options.showTerminal) {
		terminal.show(true);
	}

	// Wait for shell integration to be available
	const shellIntegration = await waitForShellIntegration(terminal);

	if (!shellIntegration) {
		// Fallback to old method if shell integration is not available
		terminal.sendText(' ');
		terminal.sendText(`cd "${options.workingDirectory}"`);
		if (options.preCommand) {
			terminal.sendText(options.preCommand);
		}
		terminal.sendText(command);
		if (options.postCommand) {
			terminal.sendText(options.postCommand);
		}
		return;
	}

	// Use shell integration to execute command
	try {
		// Build full command with directory change and pre/post commands
		const parts: string[] = [`cd "${options.workingDirectory}"`];

		if (options.preCommand) {
			parts.push(options.preCommand);
		}

		parts.push(command);

		if (options.postCommand) {
			parts.push(options.postCommand);
		}

		const fullCommand = parts.join('; ');
		const execution = shellIntegration.executeCommand(fullCommand);

		// Read output if callback provided
		if (options.onOutput) {
			(async () => {
				try {
					// Set up a timeout to prevent hanging indefinitely
					const timeout = setTimeout(() => {
						console.warn('Terminal output read timeout after 5 minutes');
					}, 5 * 60 * 1000); // 5 minutes

					try {
						for await (const data of execution.read()) {
							options.onOutput!(data);
						}
					} finally {
						clearTimeout(timeout);
					}
				} catch (error) {
					console.error('Error reading terminal output:', error);
				}
			})();
		}
	} catch (error) {
		console.error('Error executing command with shell integration:', error);
		throw error;
	}
}
