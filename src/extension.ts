import * as vscode from 'vscode';
import { readFileSync, existsSync, unlinkSync } from 'fs';
import * as xml2js from 'xml2js';
import * as types from './types';
import { safeParseJson } from './jsonHelper';
import { CodelensProvider } from './CodelensProvider';
import { updateCodeCoverageDecoration, createCodeCoverageStatusBarItem } from './coverage';
import { documentIsTestCodeunit, getALFilesInWorkspace, getDocumentIdAndName, getTestMethodRangesFromDocument } from './alFileHelper';
import { getALTestRunnerPath, getCurrentWorkspaceConfig, getDebugConfigurationsFromLaunchJson, getLaunchJsonPath, getTestFolderFromConfig, getWorkspaceFolder } from './config';
import { getOutputWriter, OutputWriter } from './output';
import { createTestController, discoverTests, discoverTestsInDocument } from './testController';
import { onChangeAppFile, publishApp } from './publish';
import { awaitFileExistence } from './file';
import { join } from 'path';
import TelemetryReporter from '@vscode/extension-telemetry';
import { createTelemetryReporter, sendDebugEvent } from './telemetry';
import { TestCoverageCodeLensProvider } from './testCoverageCodeLensProvider';
import { CodeCoverageCodeLensProvider } from './codeCoverageCodeLensProvider';
import { registerCommands } from './commands';
import { createHEADFileWatcherForTestWorkspaceFolder } from './git';
import { createPerformanceStatusBarItem } from './performance';
import { executeWithShellIntegration } from './terminalExecutor';
import { ensureTestCoverageLoaded } from './testCoverage';

let terminal: vscode.Terminal;
export let activeEditor = vscode.window.activeTextEditor;
export let alFiles: types.ALFile[] = [];
const config = vscode.workspace.getConfiguration('al-test-runner');
const passingTestColor = 'rgba(' + config.passingTestsColor.red + ',' + config.passingTestsColor.green + ',' + config.passingTestsColor.blue + ',' + config.passingTestsColor.alpha + ')';
const failingTestColor = 'rgba(' + config.failingTestsColor.red + ',' + config.failingTestsColor.green + ',' + config.failingTestsColor.blue + ',' + config.failingTestsColor.alpha + ')';
const untestedTestColor = 'rgba(' + config.untestedTestsColor.red + ',' + config.untestedTestsColor.green + ',' + config.untestedTestsColor.blue + ',' + config.untestedTestsColor.alpha + ')';
const coveredLinesColor = 'rgba(' + config.coveredLinesColor.red + ',' + config.coveredLinesColor.green + ',' + config.coveredLinesColor.blue + ',' + config.coveredLinesColor.alpha + ')';;
export const outputWriter: OutputWriter = getOutputWriter(vscode.workspace.getConfiguration('al-test-runner').testOutputLocation);
export const channelWriter: OutputWriter = getOutputWriter(types.OutputType.Channel);

function getTestFolderPath(): string | undefined {
	const config = getCurrentWorkspaceConfig(false);
	return getTestFolderFromConfig(config) || getWorkspaceFolder();
}

export const codeCoverageDecorationType = vscode.window.createTextEditorDecorationType({
	isWholeLine: true,
	overviewRulerColor: coveredLinesColor,
	backgroundColor: coveredLinesColor
});

const passingTestDecorationType = vscode.window.createTextEditorDecorationType({
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

	registerCommands(context);

	context.subscriptions.push(createCodeCoverageStatusBarItem());
	context.subscriptions.push(createPerformanceStatusBarItem());

	// Pre-load test coverage data asynchronously to avoid delays in code lens provider
	ensureTestCoverageLoaded().catch(err => {
		// Silently fail - ensureTestCoverageLoaded handles error display internally
		console.log('Test coverage pre-load completed (may have been empty or failed)');
	});

	vscode.window.onDidChangeActiveTextEditor(editor => {
		activeEditor = editor;
		if (editor) {
			if (documentIsTestCodeunit(activeEditor!.document)) {
				triggerUpdateDecorations();
			}
			updateCodeCoverageDecoration();
		}
	}, null, context.subscriptions);

	vscode.workspace.onDidChangeTextDocument(event => {
		if (activeEditor && event.document === activeEditor.document) {
			triggerUpdateDecorations();
			triggerDiscoverTestsInDocument(activeEditor.document);
		}
	}, null, context.subscriptions);

	vscode.workspace.onDidRenameFiles(event => {
		discoverTests();
	});

	vscode.workspace.onDidCreateFiles(event => {
		discoverTests();
	});

	vscode.workspace.onDidChangeTextDocument(event => {
		discoverTestsInDocument(event.document);
	});

	createHEADFileWatcherForTestWorkspaceFolder();

	telemetryReporter = createTelemetryReporter();
	context.subscriptions.push(telemetryReporter);

	alTestController = createTestController();
	context.subscriptions.push(alTestController);
	discoverTests();
}

export async function invokeTestRunner(command: string, options: types.invokeTestRunnerOptions): Promise<types.ALTestAssembly[]> {
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
			const errorResult = createErrorAssembly(
				'AL Test Runner Publish Error',
				'PublishError',
				'Publish Failed',
				result.message || 'Failed to publish the application. Tests cannot run without a successful publish.'
			);
			resolve([errorResult]);
			return;
		}

		command += ` -ResultsPath "${getALTestRunnerPath()}"`;

		if (options.enableCodeCoverage) {
			command += ' -GetCodeCoverage';
		}

		if (config.enablePerformanceProfiler) {
			command += ' -GetPerformanceProfile';
		}

		if (config.verbosePowerShell) {
			command += ' -Verbose';
		}

		if (existsSync(getLastResultPath())) {
			unlinkSync(getLastResultPath());
		}

		terminal = getALTestRunnerTerminal(getTerminalName());

		// Execute command using shell integration with real-time output parsing
		try {
			await executeWithShellIntegration(terminal, command, {
				workingDirectory: getTestFolderPath(),
				preCommand: config.preTestCommand,
				postCommand: config.postTestCommand,
				onOutput: options.onOutput,
				showTerminal: true // Show terminal initially so users can see PowerShell setup and publishing
				// Focus will switch to Test Results output when first test starts (handled by testOutputParser)
			});

			// Wait for command to complete and results file to be created
			awaitFileExistence(getLastResultPath(), 0).then(async resultsAvailable => {
				if (resultsAvailable) {
					const results: types.ALTestAssembly[] = await readTestResults(vscode.Uri.file(getLastResultPath()));
					resolve(results);
					triggerUpdateDecorations();
				} else {
					const errorResult = createErrorAssembly(
						'AL Test Runner Timeout',
						'TimeoutError',
						'Test Execution Timeout',
						'Test results file was not created. Check the terminal output for errors.'
					);
					resolve([errorResult]);
				}
			});
		} catch (error) {
			const errorResult = createErrorAssembly(
				'AL Test Runner Execution Error',
				'ExecutionError',
				'Command Execution Failed',
				error instanceof Error ? error.message : String(error)
			);
			resolve([errorResult]);
		}
	});
}

function createErrorAssembly(assemblyName: string, errorMethod: string, errorName: string, errorMessage: string): types.ALTestAssembly {
	return {
		'$': {
			name: assemblyName,
			total: '0',
			passed: '0',
			failed: '1',
			skipped: '0',
			time: '0',
			'run-time': new Date().toTimeString().split(' ')[0],
			'run-date': new Date().toISOString().split('T')[0],
			'test-framework': 'AL Test Runner',
			errors: '1'
		},
		collection: [{
			'$': {
				name: 'Error Collection',
				total: '1',
				passed: '0',
				failed: '1',
				skipped: '0',
				time: '0'
			},
			test: [{
				'$': {
					name: errorName,
					method: errorMethod,
					time: '0',
					result: 'Fail'
				},
				failure: [{
					message: errorMessage,
					'stack-trace': ''
				}]
			}]
		}]
	};
}

async function readTestResults(uri: vscode.Uri): Promise<types.ALTestAssembly[]> {
	return new Promise(async resolve => {
		const xmlParser = new xml2js.Parser();
		const resultXml = readFileSync(uri.fsPath, { encoding: 'utf-8' });
		const resultObj = await xmlParser.parseStringPromise(resultXml);
		const assemblies: types.ALTestAssembly[] = resultObj.assemblies.assembly;

		// Convert xml2js arrays to strings for failure messages and stack traces
		assemblies.forEach(assembly => {
			assembly.collection?.forEach(collection => {
				collection.test?.forEach(test => {
					if (test.failure && test.failure[0]) {
						if (Array.isArray(test.failure[0].message)) {
							test.failure[0].message = test.failure[0].message[0] || '';
						}
						if (Array.isArray(test.failure[0]['stack-trace'])) {
							test.failure[0]['stack-trace'] = test.failure[0]['stack-trace'][0] || '';
						}
					}
				});
			});
		});

		resolve(assemblies);
	});
}

export function invokeDebugTest(filename: string, selectionStart: number) {
	terminal = getALTestRunnerTerminal(getTerminalName());
	terminal.sendText(' ');
	terminal.show(true);
	terminal.sendText('cd "' + getTestFolderPath() + '"');
	terminal.sendText('Invoke-TestRunnerService -FileName "' + filename + '" -SelectionStart ' + selectionStart);
}

export async function attachDebugger() {
	if (vscode.debug.activeDebugSession) {
		return;
	}

	const attachConfigs = getDebugConfigurationsFromLaunchJson('attach');

	if (attachConfigs.length === 0) {
		vscode.window.showErrorMessage("Please define a debug configuration in launch.json before debugging tests. See [https://learn.microsoft.com/en-us/dynamics365/business-central/dev-itpro/developer/devenv-attach-debug-next](https://learn.microsoft.com/en-us/dynamics365/business-central/dev-itpro/developer/devenv-attach-debug-next)");
		throw 'Please define a debug configuration in launch.json before debugging tests.';
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

	let resultFileName = join(getALTestRunnerPath(), 'Results', sanitize(getDocumentIdAndName(activeEditor!.document)) + '.xml');
	if (!(existsSync(resultFileName))) {
		setDecorations(passingTests, failingTests, getUntestedTestDecorations(testMethodRanges));
		return;
	}

	const xmlParser = new xml2js.Parser();

	let resultXml = readFileSync(resultFileName, { encoding: 'utf-8' });
	xmlParser.parseStringPromise(resultXml).then(resultObj => {
		const collection = resultObj.assembly.collection;
		const tests = collection.shift()!.test as Array<types.ALTestResult>;

		// Convert xml2js arrays to strings for failure messages and stack traces
		tests.forEach(test => {
			if (test.failure && test.failure[0]) {
				if (Array.isArray(test.failure[0].message)) {
					test.failure[0].message = test.failure[0].message[0] || '';
				}
				if (Array.isArray(test.failure[0]['stack-trace'])) {
					test.failure[0]['stack-trace'] = test.failure[0]['stack-trace'][0] || '';
				}
			}
		});

		tests.forEach(test => {
			const testMethod = testMethodRanges.find(element => element.name === test.$.method);
			if ((null !== testMethod) && (undefined !== testMethod)) {
				const startPos = testMethod.range.start;
				const endPos = testMethod.range.end;
				testMethodRanges.splice(testMethodRanges.findIndex(element => element.name === test.$.method), 1);

				let decoration: vscode.DecorationOptions;

				switch (test.$.result) {
					case 'Pass':
						const testTime = parseFloat(test.$.time);
						decoration = { range: new vscode.Range(startPos, endPos), hoverMessage: new vscode.MarkdownString('Test passing 👍' + '\n\nExecution time: ' + testTime.toFixed(2) + 's')  };
						passingTests.push(decoration);
						break;
					case 'Fail':
						const message = test.failure[0].message;
						const stackTrace = test.failure[0]['stack-trace'];
						const hoverMessage: string = message + "\n\n" + stackTrace;
						decoration = { range: new vscode.Range(startPos, endPos), hoverMessage: hoverMessage };
						failingTests.push(decoration);

						if (config.highlightFailingLine) {
							const failingLineRange = getRangeOfFailingLineFromCallstack(stackTrace, test.$.method, activeEditor!.document);
							if (failingLineRange) {
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

export function triggerUpdateDecorations() {
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

export function getTerminalName() {
	return 'al-test-runner';
}

export function getALTestRunnerTerminal(terminalName: string = getTerminalName()): vscode.Terminal {
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

	let PSPath = join(getExtension()!.extensionPath, 'PowerShell', 'ALTestRunner.psm1');
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
	const parsed = safeParseJson(data, launchPath);
	if (!parsed) {
		vscode.window.showErrorMessage(`Failed to parse launch.json. Please check ${launchPath} for syntax errors.`);
		return { configurations: [] };
	}
	return parsed;
}

export function getAppJsonKey(keyName: string) {
	sendDebugEvent('getAppJsonKey-start', { keyName: keyName });
	const appJsonPath = join(getTestFolderPath()!, 'app.json');
	const data = readFileSync(appJsonPath, { encoding: 'utf-8' });
	const appJson = safeParseJson(data, appJsonPath);
	if (!appJson) {
		vscode.window.showErrorMessage(`Failed to parse app.json. Please check ${appJsonPath} for syntax errors.`);
		return undefined;
	}

	sendDebugEvent('getAppJsonKey-end', { keyName: keyName, keyValue: appJson[keyName] });
	return appJson[keyName];
}

function getLastResultPath(): string {
	return join(getALTestRunnerPath(), 'last.xml');
}

// this method is called when your extension is deactivated
export function deactivate() { }