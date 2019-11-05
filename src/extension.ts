// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { isUndefined } from 'util';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	const terminalName = 'al-test-runner';
	let terminal = getALTestRunnerTerminal(terminalName);	

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let command = vscode.commands.registerCommand('altestrunner.runAllTests', () => {
		terminal = getALTestRunnerTerminal(terminalName);
		terminal.sendText('Invoke-ALTestRunner -Tests All');
		terminal.show(true);
	});
	
	context.subscriptions.push(command);
	
	command = vscode.commands.registerCommand('altestrunner.runTestsCodeunit', () => {
		terminal = getALTestRunnerTerminal(terminalName);
		terminal.sendText('Invoke-ALTestRunner -Tests Codeunit -FileName "' + vscode.window.activeTextEditor!.document.fileName + '"')
		terminal.show(true);
	});
	
	context.subscriptions.push(command);
	
	command = vscode.commands.registerCommand('altestrunner.runTest', () => {
		terminal = getALTestRunnerTerminal(terminalName);
		terminal.sendText('Invoke-ALTestRunner -Tests Test -FileName "' + vscode.window.activeTextEditor!.document.fileName + '" -SelectionStart ' + vscode.window.activeTextEditor!.selection.start.line)
		terminal.show(true);
	});

	context.subscriptions.push(command);
}

function getALTestRunnerTerminal(terminalName: string): vscode.Terminal {
	let terminals = vscode.window.terminals.filter(element => element.name == terminalName);
	let terminal = terminals.shift()!;
	
	if (!(isUndefined(terminal))) {
		return terminal;
	}
	else {
		terminal = vscode.window.createTerminal(terminalName);
		let extension = vscode.extensions.getExtension('jamespearson.al-test-runner');
		let PSPath = extension!.extensionPath + '\\src\\PowerShell\\ALTestRunner.psm1';
		terminal.sendText('Import-Module "' + PSPath + '" -DisableNameChecking');
		return terminal;
	}
}

// this method is called when your extension is deactivated
export function deactivate() {}
