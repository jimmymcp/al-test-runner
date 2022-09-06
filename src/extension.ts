import * as vscode from 'vscode';
import { readFileSync, existsSync, readdirSync, unlinkSync } from 'fs';
import * as xml2js from 'xml2js';
import * as types from './types';
import { CodelensProvider } from './codeLensProvider';
import { updateCodeCoverageDecoration,  createCodeCoverageStatusBarItem, toggleCodeCoverageDisplay } from './codeCoverage';
import { documentIsTestCodeunit, getALFilesInWorkspace, getDocumentIdAndName, listALFiles } from './alFileHelper';
import { getALTestRunnerConfig, getALTestRunnerConfigPath, getALTestRunnerPath, getCurrentWorkspaceConfig, getDebugConfigurationsFromLaunchJson, getLaunchJsonPath, getTestWorkspaceFolder, setALTestRunnerConfig } from './config';
import { showTableData } from './showTableData';
import { getOutputWriter, OutputWriter } from './output';
import { createTestController, debugTestHandler, deleteTestItemForFilename, discoverTests, discoverTestsInDocument, getTestItemFromFileNameAndSelection, runTestHandler } from './testController';
import { onChangeAppFile, publishApp } from './publish';
import { awaitFileExistence } from './file';
import { join } from 'path';
import TelemetryReporter from '@vscode/extension-telemetry';
import { createTelemetryReporter, sendDebugEvent } from './telemetry';
import { TestCoverageCodeLensProvider } from './testCoverageCodeLensProvider';
import { CodeCoverageCodeLensProvider } from './codeCoverageCodeLensProvider';
import { runRelatedTests, showRelatedTests } from './testCoverage';

let terminal: vscode.Terminal;
export let activeEditor = vscode.window.activeTextEditor;
export let alFiles: types.ALFile[] = [];
const config = vscode.workspace.getConfiguration('al-test-runner');
const passingTestColor = 'rgba(' + config.passingTestsColor.red + ',' + config.passingTestsColor.green + ',' + config.passingTestsColor.blue + ',' + config.passingTestsColor.alpha + ')';
const failingTestColor = 'rgba(' + config.failingTestsColor.red + ',' + config.failingTestsColor.green + ',' + config.failingTestsColor.blue + ',' + config.failingTestsColor.alpha + ')';
const untestedTestColor = 'rgba(' + config.untestedTestsColor.red + ',' + config.untestedTestsColor.green + ',' + config.untestedTestsColor.blue + ',' + config.untestedTestsColor.alpha + ')';
export const outputWriter: OutputWriter = getOutputWriter(vscode.workspace.getConfiguration('al-test-runner').testOutputLocation);
export const channelWriter: OutputWriter = getOutputWriter(types.OutputType.Channel);

if (getTestWorkspaceFolder(true) != '') {
	const testAppsPath = join(getTestWorkspaceFolder(true), '*.app');
	const appFileWatcher = vscode.workspace.createFileSystemWatcher(testAppsPath, false, false, true);
	appFileWatcher.onDidChange(e => {
		onChangeAppFile(e);
	});
}

export const passingTestDecorationType = vscode.window.createTextEditorDecorationType({
	backgroundColor: passingTestColor
});

const failingTestDecorationType = vscode.window.createTextEditorDecorationType({
	backgroundColor: failingTestColor
});

const untestedTestDecorationType = vscode.window.createTextEditorDecorationType({
	backgroundColor: untestedTestColor
});

const failingLineDecorationType = vscode.window.createTextEditorDecorationType({
	textDecoration: config.failingLineDecoration
});

export const outputChannel = vscode.window.createOutputChannel(getTerminalName());
let updateDecorationsTimeout: NodeJS.Timer | undefined = undefined;
let discoverTestsTimeout: NodeJS.Timer | undefined = undefined;

const alTestRunnerAPI = new class {
	getWorkspaceFolder: Function | undefined;
	onOutputTestResults: Function | undefined;
};

export let alTestController: vscode.TestController;
export let telemetryReporter: TelemetryReporter;

export function activate(context: vscode.ExtensionContext) {
	console.log('jamespearson.al-test-runner extension is activated');

	let codelensProvider = new CodelensProvider();
	vscode.languages.registerCodeLensProvider("*", codelensProvider);

	let testCoverageCodeLensProvider = new TestCoverageCodeLensProvider();
	vscode.languages.registerCodeLensProvider("*", testCoverageCodeLensProvider);

	let codeCoverageCodeLensProvider = new CodeCoverageCodeLensProvider();
	vscode.languages.registerCodeLensProvider("*", codeCoverageCodeLensProvider);

	context.subscriptions.push(alTestController);

	let command = vscode.commands.registerCommand('altestrunner.runAllTests', async (extensionId?: string, extensionName?: string) => {
		runTestHandler(new vscode.TestRunRequest());
	});

	context.subscriptions.push(command);

	command = vscode.commands.registerCommand('altestrunner.runTestsCodeunit', async (filename?: string, extensionId?: string, extensionName?: string) => {
		const testItem = await getTestItemFromFileNameAndSelection(filename, 0);
		if (testItem) {
			const request = new vscode.TestRunRequest([testItem]);
			runTestHandler(request);
		}
	});

	context.subscriptions.push(command);

	command = vscode.commands.registerCommand('altestrunner.runTest', async (filename?: string, selectionStart?: number, extensionId?: string, extensionName?: string) => {
		const testItem = await getTestItemFromFileNameAndSelection(filename, selectionStart);
		if (testItem) {
			const request = new vscode.TestRunRequest([testItem]);
			runTestHandler(request);
		}
	});

	context.subscriptions.push(command);

	command = vscode.commands.registerCommand('altestrunner.debugTest', async (filename: string, selectionStart: number) => {
		const testItem = await getTestItemFromFileNameAndSelection(filename, selectionStart);
		if (testItem) {
			const request = new vscode.TestRunRequest([testItem]);
			debugTestHandler(request);
		}
	});

	context.subscriptions.push(command);

	command = vscode.commands.registerCommand('altestrunner.debugTestsCodeunit', async (filename: string) => {
		const testItem = await getTestItemFromFileNameAndSelection(filename, 0);
		if (testItem) {
			const request = new vscode.TestRunRequest([testItem]);
			debugTestHandler(request);
		}
	});

	context.subscriptions.push(command);

	command = vscode.commands.registerCommand('altestrunner.clearTestResults', async () => {
		const resultsPath = getALTestRunnerPath() + '\\Results';
		if (existsSync(resultsPath)) {
			readdirSync(resultsPath).forEach(e => unlinkSync(resultsPath + '\\' + e));
		}
		triggerUpdateDecorations();
		vscode.window.showInformationMessage('AL Test Runner results cleared');
	});

	context.subscriptions.push(command);

	command = vscode.commands.registerCommand('altestrunner.clearCredentials', async () => {
		setALTestRunnerConfig('userName', '');
		setALTestRunnerConfig('securePassword', '');
		vscode.window.showInformationMessage('AL Test Runner credentials cleared');
	});

	context.subscriptions.push(command);

	command = vscode.commands.registerCommand('altestrunner.setContainerCredential', () => {
		setALTestRunnerConfig('userName', '');
		setALTestRunnerConfig('securePassword', '');
		terminal = getALTestRunnerTerminal(getTerminalName());
		terminal.sendText(' ');
		terminal.sendText('Get-ALTestRunnerCredential');
	});

	context.subscriptions.push(command);

	command = vscode.commands.registerCommand('altestrunner.setVMCredential', () => {
		setALTestRunnerConfig('vmUserName', '');
		setALTestRunnerConfig('vmSecurePassword', '');
		terminal = getALTestRunnerTerminal(getTerminalName());
		terminal.sendText(' ');
		terminal.sendText('Get-ALTestRunnerCredential -VM');
	});

	context.subscriptions.push(command);

	command = vscode.commands.registerCommand('altestrunner.openConfigFile', async () => {
		getALTestRunnerConfig();
		vscode.window.showTextDocument(await vscode.workspace.openTextDocument(getALTestRunnerConfigPath()));
	});

	context.subscriptions.push(command);

	command = vscode.commands.registerCommand('altestrunner.installTestRunnerService', async () => {
		terminal = getALTestRunnerTerminal(getTerminalName());
		terminal.show(true);
		terminal.sendText('Install-TestRunnerService');
	});

	context.subscriptions.push(command);

	command = vscode.commands.registerCommand('altestrunner.toggleCodeCoverage', async (newCodeCoverageDisplay?: types.CodeCoverageDisplay) => {
		toggleCodeCoverageDisplay(newCodeCoverageDisplay);
	});

	context.subscriptions.push(command);

	command = vscode.commands.registerCommand('altestrunner.showTableData', async () => {
		showTableData();
	});

	command = vscode.commands.registerCommand('altestrunner.showRelatedTests', method => {
		showRelatedTests(method);
	})

	command = vscode.commands.registerCommand('altestrunner.runRelatedTests', method => {
		runRelatedTests(method);
	})

	context.subscriptions.push(command);

	command = vscode.commands.registerCommand('altestrunner.listALFiles', async () => {
		await listALFiles();
	})

	context.subscriptions.push(command);

	context.subscriptions.push(createCodeCoverageStatusBarItem());

	vscode.window.onDidChangeActiveTextEditor(editor => {
		activeEditor = editor;
		if (editor) {
			if (documentIsTestCodeunit(activeEditor!.document)) {
				triggerUpdateDecorations();
			}
			else {
				updateCodeCoverageDecoration();
			}
		}
	}, null, context.subscriptions);

	vscode.workspace.onDidChangeTextDocument(event => {
		if (activeEditor && event.document === activeEditor.document) {
			triggerUpdateDecorations();
			triggerDiscoverTestsInDocument(activeEditor.document);
		}
	}, null, context.subscriptions);

	vscode.workspace.onDidRenameFiles(event => {
		event.files.forEach(rename => {
			deleteTestItemForFilename(rename.oldUri.fsPath);
		});
	});

	vscode.workspace.onDidCreateFiles(event => {
		event.files.forEach(file => {
			deleteTestItemForFilename(file.fsPath);
		});
	});

	telemetryReporter = createTelemetryReporter();
	context.subscriptions.push(telemetryReporter);

	alTestController = createTestController();
	context.subscriptions.push(alTestController);
	discoverTests();

	return alTestRunnerAPI;
}

export async function invokeTestRunner(command: string): Promise<types.ALTestAssembly[]> {
	return new Promise(async (resolve) => {
		sendDebugEvent('invokeTestRunner-start');
		const config = getCurrentWorkspaceConfig();
		getALFilesInWorkspace(config.codeCoverageExcludeFiles).then(files => { alFiles = files });
		let publishType: types.PublishType = types.PublishType.None;

		if (!config.automaticPublishing) {
			switch (config.publishBeforeTest) {
				case 'Publish':
					publishType = types.PublishType.Publish;
					break;
				case 'Rapid application publish':
					publishType = types.PublishType.Rapid;
					break;
			}
		}

		const result = await publishApp(publishType);
		if (!result.success) {
			const results: types.ALTestAssembly[] = [];
			resolve(results);
			return;
		}

		if (config.enableCodeCoverage) {
			command += ' -GetCodeCoverage';
		}

		if (existsSync(getLastResultPath())) {
			unlinkSync(getLastResultPath());
		}

		terminal = getALTestRunnerTerminal(getTerminalName());
		terminal.sendText(' ');
		terminal.show(true);
		terminal.sendText('cd "' + getTestWorkspaceFolder() + '"');
		invokeCommand(config.preTestCommand);
		terminal.sendText(command);
		invokeCommand(config.postTestCommand);

		awaitFileExistence(getLastResultPath(), 0).then(async resultsAvailable => {
			if (resultsAvailable) {
				const results: types.ALTestAssembly[] = await readTestResults(vscode.Uri.file(getLastResultPath()));
				resolve(results);

				triggerUpdateDecorations();
				callOnOutputTestResults({ event: 'create', filename: getLastResultPath() });
			}
		});
	});
}

async function readTestResults(uri: vscode.Uri): Promise<types.ALTestAssembly[]> {
	return new Promise(async resolve => {
		const xmlParser = new xml2js.Parser();
		const resultXml = readFileSync(uri.fsPath, { encoding: 'utf-8' });
		const resultObj = await xmlParser.parseStringPromise(resultXml);
		const assemblies: types.ALTestAssembly[] = resultObj.assemblies.assembly;

		resolve(assemblies);
	});
}

export function initDebugTest(filename: string) {
	terminal = getALTestRunnerTerminal(getTerminalName());
	terminal.sendText(' ');
	terminal.show(true);
	terminal.sendText('cd "' + getTestWorkspaceFolder() + '"');
	terminal.sendText('Invoke-TestRunnerService -FileName "' + filename + '" -Init');
}

export function invokeDebugTest(filename: string, selectionStart: number) {
	terminal = getALTestRunnerTerminal(getTerminalName());
	terminal.sendText(' ');
	terminal.show(true);
	terminal.sendText('cd "' + getTestWorkspaceFolder() + '"');
	terminal.sendText('Invoke-TestRunnerService -FileName "' + filename + '" -SelectionStart ' + selectionStart);
}

export async function attachDebugger() {
	if (vscode.debug.activeDebugSession) {
		return;
	}

	const attachConfigs = getDebugConfigurationsFromLaunchJson('attach');

	if (attachConfigs.length === 0) {
		throw new Error('Please define a debug configuration in launch.json before debugging tests.');
	}

	const attachConfig = attachConfigs.shift() as vscode.DebugConfiguration;
	await vscode.debug.startDebugging(vscode.workspace.workspaceFolders![0], attachConfig);
}

function invokeCommand(command: string) {
	if (command === undefined || command === null || command === '') {
		return;
	}

	terminal.sendText(' ');
	terminal.sendText('Invoke-Script {' + command + '}');
	terminal.sendText(' ');
}

function updateDecorations() {
	if (!activeEditor) {
		return;
	}

	const config = getCurrentWorkspaceConfig();

	let passingTests: vscode.DecorationOptions[] = [];
	let failingTests: vscode.DecorationOptions[] = [];
	let untestedTests: vscode.DecorationOptions[] = [];
	let failingLines: vscode.DecorationOptions[] = [];

	const sanitize = require("sanitize-filename");

	//call with empty arrays to clear all the decorations
	setDecorations(passingTests, failingTests, untestedTests, failingLines);

	if (!(config.decorateTestMethods)) {
		setDecorations(passingTests, failingTests, untestedTests);
		return;
	}

	let testMethodRanges: types.ALMethodRange[] = getTestMethodRangesFromDocument(activeEditor!.document);

	let resultFileName = getALTestRunnerPath() + '\\Results\\' + sanitize(getDocumentIdAndName(activeEditor!.document)) + '.xml';
	if (!(existsSync(resultFileName))) {
		setDecorations(passingTests, failingTests, getUntestedTestDecorations(testMethodRanges));
		return;
	}

	const xmlParser = new xml2js.Parser();

	let resultXml = readFileSync(resultFileName, { encoding: 'utf-8' });
	xmlParser.parseStringPromise(resultXml).then(resultObj => {
		const collection = resultObj.assembly.collection;
		const tests = collection.shift()!.test as Array<types.ALTestResult>;

		tests.forEach(test => {
			const testMethod = testMethodRanges.find(element => element.name === test.$.method);
			if ((null !== testMethod) && (undefined !== testMethod)) {
				const startPos = testMethod.range.start;
				const endPos = testMethod.range.end;
				testMethodRanges.splice(testMethodRanges.findIndex(element => element.name === test.$.method), 1);

				let decoration: vscode.DecorationOptions;

				switch (test.$.result) {
					case 'Pass':
						decoration = { range: new vscode.Range(startPos, endPos), hoverMessage: 'Test passing 👍' };
						passingTests.push(decoration);
						break;
					case 'Fail':
						const hoverMessage: string = test.failure[0].message + "\n\n" + test.failure[0]["stack-trace"];
						decoration = { range: new vscode.Range(startPos, endPos), hoverMessage: hoverMessage };
						failingTests.push(decoration);

						if (config.highlightFailingLine) {
							const failingLineRange = getRangeOfFailingLineFromCallstack(test.failure[0]["stack-trace"][0], test.$.method, activeEditor!.document);
							if (failingLineRange !== undefined) {
								const decoration: vscode.DecorationOptions = { range: failingLineRange, hoverMessage: hoverMessage };
								failingLines.push(decoration);
							}
						}
						break;
					default:
						break;
				}
			}
		});

		setDecorations(passingTests, failingTests, getUntestedTestDecorations(testMethodRanges), failingLines);
	})
		.catch(err => {
			vscode.window.showErrorMessage(err);
		});
}

function setDecorations(passingTests: vscode.DecorationOptions[], failingTests: vscode.DecorationOptions[], untestedTests: vscode.DecorationOptions[], failingLines?: vscode.DecorationOptions[]) {
	activeEditor!.setDecorations(passingTestDecorationType, passingTests);
	activeEditor!.setDecorations(failingTestDecorationType, failingTests);
	activeEditor!.setDecorations(untestedTestDecorationType, untestedTests);

	if (failingLines) {
		activeEditor!.setDecorations(failingLineDecorationType, failingLines);
	}
}

function getUntestedTestDecorations(testMethodRanges: types.ALMethodRange[]): vscode.DecorationOptions[] {
	let untestedTests: vscode.DecorationOptions[] = [];
	if (testMethodRanges.length > 0) {
		testMethodRanges.forEach(element => {
			const decoration: vscode.DecorationOptions = { range: element.range, hoverMessage: 'There are no results for this test 🤷‍♀️' };
			untestedTests.push(decoration);
		});
	}

	return untestedTests;
}

function triggerUpdateDecorations() {
	if (updateDecorationsTimeout) {
		clearTimeout(updateDecorationsTimeout);
		updateDecorationsTimeout = undefined;
	}

	updateDecorationsTimeout = setTimeout(updateDecorations, 500);
}

function triggerDiscoverTestsInDocument(document: vscode.TextDocument) {
	if (discoverTestsTimeout) {
		clearTimeout(discoverTestsTimeout);
		discoverTestsTimeout = undefined;
	}

	discoverTestsTimeout = setTimeout(() => { discoverTestsInDocument(document) }, 500);
}

if (activeEditor) {
	if (documentIsTestCodeunit(activeEditor.document)) {
		triggerUpdateDecorations();
	}
}

export function getTestMethodRangesFromDocument(document: vscode.TextDocument): types.ALMethodRange[] {
	const documentText = document.getText();
	const regEx = /\[Test\]/gi;
	let testMethods: types.ALMethodRange[] = [];
	let match;

	while (match = regEx.exec(documentText)) {
		let subDocumentText = documentText.substr(match.index, 300);
		let methodMatch = subDocumentText.match('(?<=procedure ).*\\(');
		if (methodMatch !== undefined) {
			const startPos = document.positionAt(match.index + methodMatch!.index!);
			const endPos = document.positionAt(match.index + methodMatch!.index! + methodMatch![0].length - 1);
			let procedureCommentedOut = false;

			//if the line has a double slash before the method name then it has been commented out, don't include in the results
			const textLine = document.lineAt(startPos.line);
			if (textLine.text.substr(textLine.firstNonWhitespaceCharacterIndex, 2) === '//') {
				procedureCommentedOut = true;
			}

			//otherwise if there is a /* present before the procedure and */ afterwards then it has been commented out
			const commentStart = documentText.lastIndexOf('/*', match.index);
			if (commentStart !== -1) {
				const commentEnd = documentText.indexOf('*/', match.index);
				if (commentEnd !== -1) {
					procedureCommentedOut = true;
				}
			}

			if (procedureCommentedOut !== true) {
				const testMethod: types.ALMethodRange = {
					name: subDocumentText.substr(methodMatch!.index!, methodMatch![0].length - 1),
					range: new vscode.Range(startPos, endPos)
				};
				testMethods.push(testMethod);
			}
		}
	}

	return testMethods;
}

function getTerminalName() {
	return 'al-test-runner';
}

export function getALTestRunnerTerminal(terminalName: string): vscode.Terminal {
	sendDebugEvent('getALTestRunnerTerminal-start', { terminalName: terminalName });
	let terminals = vscode.window.terminals.filter(element => element.name === terminalName);
	let terminal;
	if (terminals) {
		terminal = terminals.shift()!;
	}

	if (!terminal) {
		sendDebugEvent('getALTestRunnerTerminal-createTerminal', { terminalName: terminalName });
		terminal = vscode.window.createTerminal(terminalName);
	}

	let PSPath = getExtension()!.extensionPath + '\\PowerShell\\ALTestRunner.psm1';
	terminal.sendText('if ($null -eq (Get-Module ALTestRunner)) {Import-Module "' + PSPath + '" -DisableNameChecking}');
	return terminal;
}

export function getExtension() {
	return vscode.extensions.getExtension('jamespearson.al-test-runner');
}

export function getRangeOfFailingLineFromCallstack(callstack: string, method: string, document: vscode.TextDocument): vscode.Range | void {
	const methodStartLineForCallstack = getLineNumberOfMethodDeclaration(method, document);
	if (methodStartLineForCallstack === -1) {
		return;
	}

	const matches = callstack.match(method + ' line (\\d+)');
	if ((matches !== undefined) && (matches !== null)) {
		const lineNo = parseInt(matches[1]);
		const line = document.lineAt(lineNo + methodStartLineForCallstack);
		return new vscode.Range(new vscode.Position(line.lineNumber, line.firstNonWhitespaceCharacterIndex), new vscode.Position(line.lineNumber, line.text.length));
	}
}

export function getLineNumberOfMethodDeclaration(method: string, document: vscode.TextDocument): number {
	const text = document.getText();
	const match = text.match('procedure.+' + method);
	if ((match === undefined) || (match === null)) {
		return -1;
	}

	return document.positionAt(match!.index!).line;
}

export function getCodeunitIdFromAssemblyName(assemblyName: string): number {
	const matches = assemblyName.match('\\d+');
	if (matches) {
		return parseInt(matches!.shift()!);
	}

	return (0);
}

export function getLaunchJson() {
	const launchPath = getLaunchJsonPath();
	const data = readFileSync(launchPath, { encoding: 'utf-8' });
	return JSON.parse(data);
}

export function getAppJsonKey(keyName: string) {
	const appJsonPath = getTestWorkspaceFolder() + '\\app.json';
	const data = readFileSync(appJsonPath, { encoding: 'utf-8' });
	const appJson = JSON.parse(data);
	return appJson[keyName];
}

function getLastResultPath(): string {
	return getALTestRunnerPath() + '\\last.xml';
}

export function getWorkspaceFolder() {
	if (alTestRunnerAPI.getWorkspaceFolder) {
		let override = alTestRunnerAPI.getWorkspaceFolder.call(null);
		if (override && override.length > 0) {
			return override;
		}
	}

	const wsFolders = vscode.workspace.workspaceFolders!;
	if (wsFolders !== undefined) {
		if (wsFolders.length === 1) {
			return wsFolders[0].uri.fsPath;
		}
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

function callOnOutputTestResults(context: any) {
	if (alTestRunnerAPI.onOutputTestResults) {
		alTestRunnerAPI.onOutputTestResults.call(null, context);
	}
}

// this method is called when your extension is deactivated
export function deactivate() { }