import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import * as vscode from 'vscode';
import { sendDebugEvent } from './telemetry';
import * as types from './types';
import { getTestFolderPath } from './alFileHelper';
import { activeEditor } from './extension';

export function getALTestRunnerPath(): string {
	const alTestRunnerPath = getTestFolderPath() + '\\.altestrunner';
	return alTestRunnerPath;
}

export function getALTestRunnerConfigPath(): string {
	return getALTestRunnerPath() + '\\config.json';
}

export function getALTestRunnerConfig() {
	sendDebugEvent('getALTestRunnerConfig-start')
	let alTestRunnerConfigPath = getALTestRunnerConfigPath();
	let data: string;

	try {
		data = readFileSync(alTestRunnerConfigPath, { encoding: 'utf-8' });
	} catch (error) {
		sendDebugEvent('getALTestRunnerConfig-unableToReadConfigFile');
		createALTestRunnerConfig();
		data = readFileSync(alTestRunnerConfigPath, { encoding: 'utf-8' });
	}

	let alTestRunnerConfig = JSON.parse(data);
	return alTestRunnerConfig as types.ALTestRunnerConfig;
}

export function setALTestRunnerConfig(keyName: string, keyValue: string | undefined) {
	let debugKeyValue = '';
	if (keyValue) {
		debugKeyValue = keyValue;
	}
	sendDebugEvent('setALTestRunnerConfig', { keyName: keyName, keyValue: debugKeyValue })

	let config = getALTestRunnerConfig();
	//@ts-ignore
	config[keyName] = keyValue;
	writeFileSync(getALTestRunnerConfigPath(), JSON.stringify(config), { encoding: 'utf-8' });
}

function createALTestRunnerConfig() {
	let config: types.ALTestRunnerConfig = {
		containerResultPath: "",
		launchConfigName: "",
		securePassword: "",
		userName: "",
		companyName: "",
		testSuiteName: "",
		vmUserName: "",
		vmSecurePassword: "",
		remoteContainerName: "",
		dockerHost: "",
		newPSSessionOptions: "",
		testRunnerServiceUrl: "",
		codeCoveragePath: ".//.altestrunner//codecoverage.json",
		culture: "en-US"
	};

	createALTestRunnerDir();
	writeFileSync(getALTestRunnerConfigPath(), JSON.stringify(config, null, 2), { encoding: 'utf-8' });
}

function createALTestRunnerDir() {
	if (getALTestRunnerPath() === '') {
		return;
	}

	if (!(existsSync(getALTestRunnerPath()))) {
		mkdirSync(getALTestRunnerPath());
	}
}

export function launchConfigIsValid(alTestRunnerConfig?: types.ALTestRunnerConfig): types.launchConfigValidity {
	sendDebugEvent('launchConfigIsValid-start');

	if (alTestRunnerConfig === undefined) {
		alTestRunnerConfig = getALTestRunnerConfig();
	}

	if (alTestRunnerConfig.launchConfigName === '') {
		return types.launchConfigValidity.Invalid;
	}
	else {
		let debugConfigurations = getDebugConfigurationsFromLaunchJson('launch');
		const filteredDebugConfigurations = debugConfigurations.filter(element => element.name === alTestRunnerConfig!.launchConfigName);
		switch (filteredDebugConfigurations.length) {
			case 0:
				return types.launchConfigValidity.Invalid;
			case 1:
				return types.launchConfigValidity.Valid;
			default:
				vscode.window.showErrorMessage(`There are ${filteredDebugConfigurations.length} launch configurations with the name "${alTestRunnerConfig!.launchConfigName}". Please make sure that each launch configuration has a unique name.`, {}, "Open config").then(
					action => {
						if (action == "Open config") {
							vscode.commands.executeCommand("workbench.action.debug.configure")
						}
					}
				);
				return types.launchConfigValidity.NeverValid;
		}
	}
}

export function getDebugConfigurationsFromLaunchJson(type: string) {
	const testWorkspaceFolder = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(getALTestRunnerConfigPath()));
	const configuration = vscode.workspace.getConfiguration('launch', testWorkspaceFolder);
	const debugConfigurations = configuration.configurations as Array<vscode.DebugConfiguration>;
	return debugConfigurations.filter(element => { return element.request === type; }).slice();
}

export function getLaunchJsonPath() {
	return getTestFolderPath() + '\\.vscode\\launch.json';
}

export async function selectLaunchConfig() {
	sendDebugEvent('selectLaunchConfig-start');

	let debugConfigurations = getDebugConfigurationsFromLaunchJson('launch');
	let selectedConfig;

	if (debugConfigurations.length === 1) {
		selectedConfig = debugConfigurations.shift()!.name;
	}
	else if (debugConfigurations.length > 1) {
		let configNames: Array<string> = debugConfigurations.map(element => element.name);
		selectedConfig = await vscode.window.showQuickPick(configNames, { canPickMany: false, placeHolder: 'Please select a configuration to run tests against' });
	}

	setALTestRunnerConfig('launchConfigName', selectedConfig);
}

export function getCurrentWorkspaceConfig(forTestFolder: boolean = true) {
	let testFolderPath: string | undefined;
	if (forTestFolder) {
		testFolderPath = getTestFolderPath();
	}

	if (testFolderPath) {
		return vscode.workspace.getConfiguration('al-test-runner', vscode.Uri.file(testFolderPath));
	}
	else {
		return vscode.workspace.getConfiguration('al-test-runner');
	}
}

export function getLaunchConfiguration(configName: string): string {
	const configs = getDebugConfigurationsFromLaunchJson('launch') as Array<vscode.DebugConfiguration>;
	const config = JSON.stringify(configs.filter(element => element.name == configName)[0]);
	return config;
}

export function getTestFolderFromConfig(config: vscode.WorkspaceConfiguration): string | undefined {
	if (!config.testFolderName) {
		return undefined;
	}

	let workspaceFolders = vscode.workspace.workspaceFolders;
	if (!workspaceFolders) {
		return undefined;
	}

	workspaceFolders = workspaceFolders.filter(folder => {
		return folder.name === config.testFolderName;
	});

	if (workspaceFolders.length > 0) {
		return workspaceFolders[0].uri.fsPath;
	}
}

export function getWorkspaceFolder(): string {
	const workspaceFolders = vscode.workspace.workspaceFolders;
	if (!workspaceFolders) {
		return '';
	}

	if (workspaceFolders.length === 1) {
		return workspaceFolders[0].uri.fsPath;
	}

	const discoveredTestFolder = discoverTestWorkspaceFolder(workspaceFolders);
	if (discoveredTestFolder) {
		return discoveredTestFolder;
	}

	if (activeEditor) {
		const workspace = vscode.workspace.getWorkspaceFolder(activeEditor!.document.uri);
		if (workspace) {
			return workspace.uri.fsPath;
		}
	}

	if (vscode.window.visibleTextEditors.length > 0) {
		const workspace = vscode.workspace.getWorkspaceFolder(vscode.window.visibleTextEditors[0].document.uri);
		if (workspace) {
			return workspace.uri.fsPath;
		}
	}

	throw new Error('Please open a file in the project you want to run the tests for.');
}

export function discoverTestWorkspaceFolder(workspaceFolders: readonly vscode.WorkspaceFolder[]): string | undefined {
	if (!workspaceFolders) {
		return undefined;
	}

	let testFolder: string = '';

	const config = getCurrentWorkspaceConfig(false);
	const identifiers: string[] = config.testWorkspaceFolderIdentifiers;
	identifiers.forEach(identifier => {
		if (!testFolder) {
			const testFolders = workspaceFolders.filter(folder => {
				if (folder.name.toLowerCase().endsWith(identifier.toLowerCase()) || folder.name.toLowerCase().startsWith(identifier.toLowerCase())) {
					return true;
				}
			});

			if (testFolders[0]) {
				testFolder = testFolders[0].uri.fsPath;
			}
		}
	});

	if (testFolder !== '') {
		return testFolder;
	}
	else {
		return undefined;
	}
}