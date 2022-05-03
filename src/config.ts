import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import * as vscode from 'vscode';
import { getWorkspaceFolder } from "./extension";
import * as types from './types';

export function getTestWorkspaceFolder(onlyTest: boolean = false): string {
    let config = vscode.workspace.getConfiguration('al-test-runner');
    if (config.testFolderName) {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders) {
            let testFolder = workspaceFolders.filter(element => {
                return element.name == config.testFolderName;
            });
            if (testFolder.length == 1) {
                return testFolder.shift()!.uri.fsPath;
            }
        }
	}
	
	if (!onlyTest) {
		return getWorkspaceFolder();
	}
	return '';
}

export function getALTestRunnerPath(): string {
	const alTestRunnerPath = getTestWorkspaceFolder() + '\\.altestrunner';
	return alTestRunnerPath;
}

export function getALTestRunnerConfigPath(): string {
	return getALTestRunnerPath() + '\\config.json';
}

export function getALTestRunnerConfig() {
	let alTestRunnerConfigPath = getALTestRunnerConfigPath();
	let data: string;

	try {
		data = readFileSync(alTestRunnerConfigPath, { encoding: 'utf-8' });
	} catch (error) {
		createALTestRunnerConfig();
		data = readFileSync(alTestRunnerConfigPath, { encoding: 'utf-8' });
	}

	let alTestRunnerConfig = JSON.parse(data);
	return alTestRunnerConfig as types.ALTestRunnerConfig;
}

export function setALTestRunnerConfig(keyName: string, keyValue: string | undefined) {
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
		codeCoveragePath: ".//.altestrunner//codecoverage.json"
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

export function launchConfigIsValid(alTestRunnerConfig?: types.ALTestRunnerConfig): boolean {
	if (alTestRunnerConfig === undefined) {
		alTestRunnerConfig = getALTestRunnerConfig();
	}

	if (alTestRunnerConfig.launchConfigName === '') {
		return false;
	}
	else {
		let debugConfigurations = getDebugConfigurationsFromLaunchJson('launch');
		return debugConfigurations.filter(element => element.name === alTestRunnerConfig!.launchConfigName).length === 1;
	}
}

export function getDebugConfigurationsFromLaunchJson(type: string) {
	const configuration = vscode.workspace.getConfiguration('launch', vscode.Uri.file(getLaunchJsonPath()));
	const debugConfigurations = configuration.configurations as Array<vscode.DebugConfiguration>;
	return debugConfigurations.filter(element => { return element.request === type; }).slice();
}

export function getLaunchJsonPath() {
	return getTestWorkspaceFolder() + '\\.vscode\\launch.json';
}

export async function selectLaunchConfig() {
	let debugConfigurations = getDebugConfigurationsFromLaunchJson('launch');
	let selectedConfig;

	if (debugConfigurations.length === 1) {
		selectedConfig = debugConfigurations.shift()!.name;
	}
	else if (debugConfigurations.length > 1) {
		let configNames: Array<string> = debugConfigurations.map(element => element.name);
		selectedConfig = await vscode.window.showQuickPick(configNames, { canPickMany: false, placeHolder: 'Please select a configuration to run tests against' });
		if (selectedConfig === undefined) {
			vscode.window.showErrorMessage('Please select a configuration before running tests');
		}
		else {
			vscode.window.showInformationMessage('"' + selectedConfig + '" selected. Please run the command again to run the test(s).');
		}
	}

	setALTestRunnerConfig('launchConfigName', selectedConfig);
}

export function getCurrentWorkspaceConfig() {
	return vscode.workspace.getConfiguration('al-test-runner', vscode.Uri.file(getTestWorkspaceFolder()));
}