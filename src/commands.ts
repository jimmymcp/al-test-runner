import * as vscode from 'vscode';
import { debugTestHandler, getTestItemFromFileNameAndSelection, runTestHandler } from './testController';
import { getALTestRunnerConfig, getALTestRunnerConfigPath, getALTestRunnerPath, getLaunchConfiguration, setALTestRunnerConfig } from './config';
import { existsSync, readdirSync, unlinkSync } from 'fs';
import { getALTestRunnerTerminal, getTerminalName, triggerUpdateDecorations } from './extension';
import * as types from './types'
import { toggleCodeCoverageDisplay } from './codeCoverage';
import { showTableData } from './showTableData';
import { runRelatedTests, showRelatedTests } from './testCoverage';
import { listALFiles } from './alFileHelper';

export function registerCommands(context: vscode.ExtensionContext) {
    context.subscriptions.push(vscode.commands.registerCommand('altestrunner.runAllTests', async (extensionId?: string, extensionName?: string) => {
        runTestHandler(new vscode.TestRunRequest());
    }));

    context.subscriptions.push(vscode.commands.registerCommand('altestrunner.runTestsCodeunit', async (filename?: string, extensionId?: string, extensionName?: string) => {
        const testItem = await getTestItemFromFileNameAndSelection(filename, 0);
        if (testItem) {
            const request = new vscode.TestRunRequest([testItem]);
            runTestHandler(request);
        }
    }));

    context.subscriptions.push(vscode.commands.registerCommand('altestrunner.runTest', async (filename?: string, selectionStart?: number, extensionId?: string, extensionName?: string) => {
		const testItem = await getTestItemFromFileNameAndSelection(filename, selectionStart);
		if (testItem) {
			const request = new vscode.TestRunRequest([testItem]);
			runTestHandler(request);
		}
	}));

	context.subscriptions.push(vscode.commands.registerCommand('altestrunner.debugTest', async (filename: string, selectionStart: number) => {
		const testItem = await getTestItemFromFileNameAndSelection(filename, selectionStart);
		if (testItem) {
			const request = new vscode.TestRunRequest([testItem]);
			debugTestHandler(request);
		}
	}));

	context.subscriptions.push(vscode.commands.registerCommand('altestrunner.debugTestsCodeunit', async (filename: string) => {
		const testItem = await getTestItemFromFileNameAndSelection(filename, 0);
		if (testItem) {
			const request = new vscode.TestRunRequest([testItem]);
			debugTestHandler(request);
		}
	}));

	context.subscriptions.push(vscode.commands.registerCommand('altestrunner.clearTestResults', async () => {
		const resultsPath = getALTestRunnerPath() + '\\Results';
		if (existsSync(resultsPath)) {
			readdirSync(resultsPath).forEach(e => unlinkSync(resultsPath + '\\' + e));
		}
		triggerUpdateDecorations();
		vscode.window.showInformationMessage('AL Test Runner results cleared');
	}));

	context.subscriptions.push(vscode.commands.registerCommand('altestrunner.clearCredentials', async () => {
		setALTestRunnerConfig('userName', '');
		setALTestRunnerConfig('securePassword', '');
		vscode.window.showInformationMessage('AL Test Runner credentials cleared');
	}));

	context.subscriptions.push(vscode.commands.registerCommand('altestrunner.setContainerCredential', () => {
		setALTestRunnerConfig('userName', '');
		setALTestRunnerConfig('securePassword', '');
		let terminal = getALTestRunnerTerminal(getTerminalName());
		terminal.sendText(' ');
		terminal.sendText('Get-ALTestRunnerCredential');
	}));

	context.subscriptions.push(vscode.commands.registerCommand('altestrunner.setVMCredential', () => {
		setALTestRunnerConfig('vmUserName', '');
		setALTestRunnerConfig('vmSecurePassword', '');
		let terminal = getALTestRunnerTerminal(getTerminalName());
		terminal.sendText(' ');
		terminal.sendText('Get-ALTestRunnerCredential -VM');
	}));

	context.subscriptions.push(vscode.commands.registerCommand('altestrunner.openConfigFile', async () => {
		getALTestRunnerConfig();
		vscode.window.showTextDocument(await vscode.workspace.openTextDocument(getALTestRunnerConfigPath()));
	}));

	context.subscriptions.push(vscode.commands.registerCommand('altestrunner.installTestRunnerService', async () => {
		let terminal = getALTestRunnerTerminal(getTerminalName());
		terminal.show(true);
		terminal.sendText(`Install-TestRunnerService -LaunchConfig '${getLaunchConfiguration(getALTestRunnerConfig().launchConfigName)}'`);
	}));

	context.subscriptions.push(vscode.commands.registerCommand('altestrunner.toggleCodeCoverage', async (newCodeCoverageDisplay?: types.CodeCoverageDisplay) => {
		toggleCodeCoverageDisplay(newCodeCoverageDisplay);
	}));

	vscode.commands.registerCommand('altestrunner.showTableData', async () => {
		showTableData();
	});

	vscode.commands.registerCommand('altestrunner.showRelatedTests', method => {
		showRelatedTests(method);
	})

	vscode.commands.registerCommand('altestrunner.runRelatedTests', method => {
		runRelatedTests(method);
	})

	context.subscriptions.push(vscode.commands.registerCommand('altestrunner.listALFiles', async () => {
		await listALFiles();
	}));
}