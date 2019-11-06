// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { isUndefined } from 'util';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';

interface ALTestRunnerConfig {
	launchConfigName: string,
	containerResultPath: string,
	userName: string,
	securePassword: string;
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('jamespearson.al-test-runner extension has been enabled');	
	let terminal: vscode.Terminal;

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let command = vscode.commands.registerCommand('altestrunner.runAllTests', async () => {
		await readyToRunTests().then(ready => {
			if (ready) {
				terminal = getALTestRunnerTerminal(getTerminalName());
				terminal.sendText('Invoke-ALTestRunner -Tests All');
				terminal.show(true);
			}
		});
	});
	
	context.subscriptions.push(command);
	
	command = vscode.commands.registerCommand('altestrunner.runTestsCodeunit', async () => {
		await readyToRunTests().then(ready => {
			if (ready) {
				terminal = getALTestRunnerTerminal(getTerminalName());
				terminal.sendText('Invoke-ALTestRunner -Tests Codeunit -FileName "' + vscode.window.activeTextEditor!.document.fileName + '"')
				terminal.show(true);
			}
		});
	});
	
	context.subscriptions.push(command);
	
	command = vscode.commands.registerCommand('altestrunner.runTest', async () => {
		await readyToRunTests().then(ready => {
			if (ready) {
				terminal = getALTestRunnerTerminal(getTerminalName());
				terminal.sendText('Invoke-ALTestRunner -Tests Test -FileName "' + vscode.window.activeTextEditor!.document.fileName + '" -SelectionStart ' + vscode.window.activeTextEditor!.selection.start.line)
				terminal.show(true);
			}
		});
	});

	context.subscriptions.push(command);
}

function getTerminalName() {
	return 'al-test-runner';
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
		let PSPath = extension!.extensionPath + '\\PowerShell\\ALTestRunner.psm1';
		terminal.sendText('Import-Module "' + PSPath + '" -DisableNameChecking');
		return terminal;
	}
}

function readyToRunTests(): Promise<boolean> {
	return new Promise((resolve, reject) => {
		if (!(launchConfigIsValid())) {
			//clear the credentials if the launch config is not valid
			setALTestRunnerConfig('userName','');
			setALTestRunnerConfig('securePassword','');
			selectLaunchConfig();
		}

		if (launchConfigIsValid()) {
			resolve(true);
		}
		else {
			reject()
		}
	});
}

function launchConfigIsValid(): boolean {
	let alTestRunnerConfig = getALTestRunnerConfig();
	if (alTestRunnerConfig.launchConfigName == '') {
		return false;
	}
	else {
		let debugConfigurations = getDebugConfigurationsFromLaunchJson(getLaunchJson());
		return debugConfigurations.filter(element => element.name == alTestRunnerConfig.launchConfigName).length == 1;
	}
}

async function selectLaunchConfig() {
	let debugConfigurations = getDebugConfigurationsFromLaunchJson(getLaunchJson());
	let selectedConfig;
	
	if (debugConfigurations.length == 1) {
		selectedConfig = debugConfigurations.shift()!.name;
	}
	else if (debugConfigurations.length > 1) {
		let configNames: Array<string> = debugConfigurations.map(element => element.name);
		selectedConfig = await vscode.window.showQuickPick(configNames, {canPickMany: false, placeHolder: 'Please select a configuration to run tests against'});
		if (isUndefined(selectedConfig)) {
			vscode.window.showErrorMessage('Please select a configuration before running tests');
		}
		else {
			vscode.window.showInformationMessage('"' + selectedConfig + '" selected. Please run the command again to run the test(s).');
		}
	}

	setALTestRunnerConfig('launchConfigName', selectedConfig);
}


//@ts-ignore
function getDebugConfigurationsFromLaunchJson(launchJson) {
	let configurations = launchJson.configurations as Array<vscode.DebugConfiguration>;
	let debugConfigurations = configurations.filter(element => element.request == 'launch');
	return debugConfigurations;
}

function getLaunchJson() {
	let wsFolders = vscode.workspace.workspaceFolders!;
	let rootFolder = wsFolders.shift();
	let launchPath = rootFolder!.uri.fsPath + '\\.vscode\\launch.json';
	let data = readFileSync(launchPath, {encoding: 'utf-8'});
	let launchConfig = JSON.parse(data);
	return launchConfig;
}

function getALTestRunnerPath(): string {
	let wsFolders = vscode.workspace.workspaceFolders!;
	let rootFolder = wsFolders.shift();
	let alTestRunnerPath = rootFolder!.uri.fsPath + '\\.altestrunner';
	return alTestRunnerPath;
}

function getALTestRunnerConfigPath(): string {
	return getALTestRunnerPath() + '\\config.json';
}

function getALTestRunnerConfig() {
	let alTestRunnerConfigPath = getALTestRunnerConfigPath();
	let data: string;

	try {
		data = readFileSync(alTestRunnerConfigPath, {encoding: 'utf-8'});
	} catch (error) {		
		createALTestRunnerConfig();
		data = readFileSync(alTestRunnerConfigPath, {encoding: 'utf-8'});
	}

	let alTestRunnerConfig = JSON.parse(data);
	return alTestRunnerConfig as ALTestRunnerConfig;
}

function setALTestRunnerConfig(keyName: string, keyValue: string | undefined) {
	let config = getALTestRunnerConfig();
	//@ts-ignore
	config[keyName] = keyValue;
	writeFileSync(getALTestRunnerConfigPath(), JSON.stringify(config), {encoding: 'utf-8'});
}

function createALTestRunnerConfig() {
	let config: ALTestRunnerConfig = {
		containerResultPath: "",
		launchConfigName: "",
		securePassword: "",
		userName: ""
	};

	mkdirSync(getALTestRunnerPath(), {recursive: true});
	writeFileSync(getALTestRunnerConfigPath(), JSON.stringify(config), {encoding: 'utf-8'});
}


// this method is called when your extension is deactivated
export function deactivate() {}
