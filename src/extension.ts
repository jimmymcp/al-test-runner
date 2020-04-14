// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { isUndefined } from 'util';
import { readFileSync, writeFileSync, mkdirSync, existsSync, watch, readdirSync, unlinkSync, unwatchFile } from 'fs';
import * as xml2js from 'xml2js';
import * as types from './types';
import { CodelensProvider } from './CodelensProvider';

let terminal: vscode.Terminal;
let activeEditor = vscode.window.activeTextEditor;
const config = vscode.workspace.getConfiguration('al-test-runner');
const passingTestColor = 'rgba(' + config.passingTestsColor.red + ',' + config.passingTestsColor.green + ',' + config.passingTestsColor.blue + ',' + config.passingTestsColor.alpha + ')';
const failingTestColor = 'rgba(' + config.failingTestsColor.red + ',' + config.failingTestsColor.green + ',' + config.failingTestsColor.blue + ',' + config.failingTestsColor.alpha + ')';
const untestedTestColor = 'rgba(' + config.untestedTestsColor.red + ',' + config.untestedTestsColor.green + ',' + config.untestedTestsColor.blue + ',' + config.untestedTestsColor.alpha + ')';

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

const outputChannel = vscode.window.createOutputChannel(getTerminalName());
let testsOutput: boolean;
let timeout: NodeJS.Timer | undefined = undefined;
let isTestCodeunit: boolean;

const alTestRunnerAPI = new class {
	getWorkspaceFolder: Function | undefined;
	onOutputTestResults: Function | undefined;
};

export function activate(context: vscode.ExtensionContext) {
	console.log('jamespearson.al-test-runner extension is activated');

	let codelensProvider = new CodelensProvider();
	vscode.languages.registerCodeLensProvider("*", codelensProvider);

	let command = vscode.commands.registerCommand('altestrunner.runAllTests', async (extensionId?: string, extensionName?: string) => {
		await readyToRunTests().then(ready => {
			if (ready) {
				if (extensionId === undefined) {
					extensionId = getAppJsonKey('id');
				}

				if (extensionName === undefined) {
					extensionName = getAppJsonKey('name');
				}

				invokeTestRunner('Invoke-ALTestRunner -Tests All -ExtensionId ' + extensionId + ' -ExtensionName "' + extensionName + '"');
			}
		});
	});

	context.subscriptions.push(command);

	command = vscode.commands.registerCommand('altestrunner.runTestsCodeunit', async (filename?: string, extensionId?: string, extensionName?: string) => {
		await readyToRunTests().then(ready => {
			if (ready) {
				if (filename === undefined) {
					filename = vscode.window.activeTextEditor!.document.fileName;
				}
				if (extensionId === undefined) {
					extensionId = getAppJsonKey('id');
				}
				if (extensionName === undefined) {
					extensionName = getAppJsonKey('name');
				}

				invokeTestRunner('Invoke-ALTestRunner -Tests Codeunit -ExtensionId ' + extensionId + ' -ExtensionName "' + extensionName + '" -FileName "' + filename + '"');
			}
		});
	});

	context.subscriptions.push(command);

	command = vscode.commands.registerCommand('altestrunner.runTest', async (filename?: string, selectionStart?: number, extensionId?: string, extensionName?: string) => {
		await readyToRunTests().then(ready => {
			if (ready) {
				if (filename === undefined) {
					filename = vscode.window.activeTextEditor!.document.fileName;
				}
				if (selectionStart === undefined) {
					selectionStart = vscode.window.activeTextEditor!.selection.start.line;
				}
				if (extensionId === undefined) {
					extensionId = getAppJsonKey('id');
				}
				if (extensionName === undefined) {
					extensionName = getAppJsonKey('name');
				}

				invokeTestRunner('Invoke-ALTestRunner -Tests Test -ExtensionId ' + extensionId + ' -ExtensionName "' + extensionName + '" -FileName "' + filename + '" -SelectionStart ' + selectionStart);
			}
		});
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

	vscode.window.onDidChangeActiveTextEditor(editor => {
		activeEditor = editor;
		if (editor) {
			isTestCodeunit = documentIsTestCodeunit(activeEditor!.document);
			triggerUpdateDecorations();
		}
	}, null, context.subscriptions);

	vscode.workspace.onDidChangeTextDocument(event => {
		if (activeEditor && event.document === activeEditor.document) {
			triggerUpdateDecorations();
		}
	}, null, context.subscriptions);

	return alTestRunnerAPI;
}

async function invokeTestRunner(command: string) {
	const config = vscode.workspace.getConfiguration('al-test-runner');

	switch (config.publishBeforeTest) {
		case 'Publish':
			await vscode.commands.executeCommand('al.publishNoDebug');
			break;
		case 'Rapid application publish':
			await vscode.commands.executeCommand('al.incrementalPublishNoDebug');
			break;
	}

	terminal = getALTestRunnerTerminal(getTerminalName());
	terminal.sendText(' ');
	terminal.show(true);
	terminal.sendText('cd "' + getWorkspaceFolder() + '"');
	invokeCommand(config.preTestCommand);
	terminal.sendText(command);
	invokeCommand(config.postTestCommand);

	writeFileSync(getLastResultPath(), '');
	testsOutput = false;
	watch(getLastResultPath(), async (event, filename) => {
		if (await outputTestResults()) {
			outputChannel.show(true);
			let context = { event: event, filename: filename };
			callOnOutputTestResults(context);
			triggerUpdateDecorations();
		}
	});
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
	const config = vscode.workspace.getConfiguration('al-test-runner');

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

	let testMethodRanges: types.ALTestMethodRange[] = getTestMethodRangesFromDocument(activeEditor!.document);

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

		const documentText = activeEditor!.document.getText();
		tests.forEach(test => {
			const matches = documentText.match('(?<=procedure )' + test.$.method + '\(\)');
			if ((matches !== undefined) && (matches !== null)) {
				const startPos = activeEditor!.document.positionAt(matches!.index!);
				const endPos = activeEditor!.document.positionAt(matches!.index! + matches![0].length);
				let methodName = documentText.substr(matches!.index!, matches![0].length);

				let arrayNo = testMethodRanges.findIndex(element => element.name === methodName);
				if (arrayNo >= 0) {
					testMethodRanges.splice(arrayNo, 1);
				}

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
							const failingLineRange = getRangeOfFailingLineFromCallstack(test.failure[0]["stack-trace"][0], methodName, activeEditor!.document);
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

	if (failingLines !== undefined) {
		activeEditor!.setDecorations(failingLineDecorationType, failingLines);
	}
}

function getUntestedTestDecorations(testMethodRanges: types.ALTestMethodRange[]): vscode.DecorationOptions[] {
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
	if (!isTestCodeunit) {
		return;
	}

	if (timeout) {
		clearTimeout(timeout);
		timeout = undefined;
	}

	timeout = setTimeout(updateDecorations, 500);
}

if (activeEditor) {
	isTestCodeunit = documentIsTestCodeunit(activeEditor.document);
	triggerUpdateDecorations();
}

export function getTestMethodRangesFromDocument(document: vscode.TextDocument): types.ALTestMethodRange[] {
	const documentText = document.getText();
	const regEx = /\[Test\]/gi;
	let testMethods: types.ALTestMethodRange[] = [];
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
				const testMethod: types.ALTestMethodRange = {
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

function getALTestRunnerTerminal(terminalName: string): vscode.Terminal {
	let terminals = vscode.window.terminals.filter(element => element.name === terminalName);
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
			//clear the credentials and company name if the launch config is not valid
			setALTestRunnerConfig('userName', '');
			setALTestRunnerConfig('securePassword', '');
			setALTestRunnerConfig('companyName', '');
			selectLaunchConfig();
		}

		if (launchConfigIsValid()) {
			resolve(true);
		}
		else {
			reject();
		}
	});
}

export function launchConfigIsValid(alTestRunnerConfig?: types.ALTestRunnerConfig, launchJson?: object): boolean {
	if (alTestRunnerConfig === undefined) {
		alTestRunnerConfig = getALTestRunnerConfig();
	}

	if (launchJson === undefined) {
		launchJson = getLaunchJson();
	}

	if (alTestRunnerConfig.launchConfigName === '') {
		return false;
	}
	else {
		let debugConfigurations = getDebugConfigurationsFromLaunchJson(launchJson);
		return debugConfigurations.filter(element => element.name === alTestRunnerConfig!.launchConfigName).length === 1;
	}
}

async function selectLaunchConfig() {
	let debugConfigurations = getDebugConfigurationsFromLaunchJson(getLaunchJson());
	let selectedConfig;

	if (debugConfigurations.length === 1) {
		selectedConfig = debugConfigurations.shift()!.name;
	}
	else if (debugConfigurations.length > 1) {
		let configNames: Array<string> = debugConfigurations.map(element => element.name);
		selectedConfig = await vscode.window.showQuickPick(configNames, { canPickMany: false, placeHolder: 'Please select a configuration to run tests against' });
		if (isUndefined(selectedConfig)) {
			vscode.window.showErrorMessage('Please select a configuration before running tests');
		}
		else {
			vscode.window.showInformationMessage('"' + selectedConfig + '" selected. Please run the command again to run the test(s).');
		}
	}

	setALTestRunnerConfig('launchConfigName', selectedConfig);
}

export function documentIsTestCodeunit(document: vscode.TextDocument): boolean {
	if (document.fileName.substr(document.fileName.lastIndexOf('.')) !== '.al') {
		return false;
	}

	const text = document.getText(new vscode.Range(0, 0, 10, 0));
	return (text.match('Subtype = Test;') !== null);
}

export function getDocumentIdAndName(document: vscode.TextDocument): string {
	let firstLine = document.getText(new vscode.Range(0, 0, 0, 250));
	let matches = firstLine.match('\\d+ .*');
	if (!(isUndefined(matches))) {
		return matches!.shift()!.replace(/"/g, '');
	}
	else {
		return '';
	}
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
	const match = text.match('procedure.+' + method + '\(.*\)');
	if ((match === undefined) || (match === null)) {
		return -1;
	}

	return document.positionAt(match!.index!).line;
}

export async function getFilePathByCodeunitId(codeunitId: number, method?: string): Promise<string> {
	return new Promise(async (resolve, reject) => {
		const config = vscode.workspace.getConfiguration('al-test-runner');
		const globPattern = config.testCodeunitGlobPattern;
		if ((globPattern === '') || (globPattern === undefined)) {
			resolve('');
		}

		const files = await vscode.workspace.findFiles(globPattern);
		for (let file of files) {
			const text = readFileSync(file.fsPath, { encoding: 'utf-8' });
			if (text.startsWith('codeunit ' + codeunitId)) {
				let filePath = file.fsPath;
				if (method !== undefined) {
					const matches = text.match('procedure.*' + method + '\(\)');
					if (matches !== undefined) {
						const document = await vscode.workspace.openTextDocument(file.fsPath);
						const lineNo = document.positionAt(matches!.index!).line + 1;
						filePath += ':' + lineNo;
					}
				}
				resolve(filePath);
			}
		}

		resolve('could not find codeunit ' + codeunitId + ' with pattern ' + globPattern);
	});
}

export function getCodeunitIdFromAssemblyName(assemblyName: string): number {
	const matches = assemblyName.match('\\d+');
	return parseInt(matches!.shift()!);
}

async function outputTestResults(): Promise<Boolean> {
	return new Promise(async (resolve, reject) => {
		if (testsOutput) {
			resolve(false);
			return;
		}

		if (existsSync(getLastResultPath())) {
			unwatchFile(getLastResultPath());
			const xmlParser = new xml2js.Parser();
			const resultXml = readFileSync(getLastResultPath(), { encoding: 'utf-8' });

			let noOfTests: number = 0;
			let noOfFailures: number = 0;
			let noOfSkips: number = 0;
			let totalTime: number = 0;
			const resultObj = await xmlParser.parseStringPromise(resultXml);
			const assemblies: types.ALTestAssembly[] = resultObj.assemblies.assembly;

			if (assemblies.length > 0) {
				outputChannel.clear();
				testsOutput = true;
			}

			for (let assembly of assemblies) {
				noOfTests += parseInt(assembly.$.total);
				const assemblyTime = parseFloat(assembly.$.time);
				totalTime += assemblyTime;
				const failed = parseInt(assembly.$.failed);
				noOfFailures += failed;
				const skipped = parseInt(assembly.$.skipped);
				noOfSkips += skipped;

				if (failed > 0) {
					outputChannel.appendLine('❌ ' + assembly.$.name + '\t' + assemblyTime.toFixed(2) + 's');
				}
				else {
					outputChannel.appendLine('✅ ' + assembly.$.name + '\t' + assemblyTime.toFixed(2) + 's');
				}
				for (let test of assembly.collection[0].test) {
					const testTime = parseFloat(test.$.time);
					let filePath = '';
					switch (test.$.result) {
						case 'Pass':
							outputChannel.appendLine('\t✅ ' + test.$.method + '\t' + testTime.toFixed(2) + 's');
							break;
						case 'Skip':
							filePath = await getFilePathByCodeunitId(getCodeunitIdFromAssemblyName(assembly.$.name), test.$.method);
							outputChannel.appendLine('\t❓ ' + test.$.method + '\t' + testTime.toFixed(2) + 's ' + filePath);
							break;
						case 'Fail':
							filePath = await getFilePathByCodeunitId(getCodeunitIdFromAssemblyName(assembly.$.name), test.$.method);
							outputChannel.appendLine('\t❌ ' + test.$.method + '\t' + testTime.toFixed(2) + "s " + filePath);
							outputChannel.appendLine('\t\t' + test.failure[0].message);
							break;
						default:
							break;
					}
				}
			}

			if ((noOfFailures + noOfSkips) === 0) {
				outputChannel.appendLine('✅ ' + noOfTests + ' test(s) ran in ' + totalTime.toFixed(2) + 's at ' + assemblies[0].$!["run-time"]);
			}
			else {
				outputChannel.appendLine('❌ ' + noOfTests + ' test(s) ran in ' + totalTime.toFixed(2) + 's - ' + (noOfFailures + noOfSkips) + ' test(s) failed/skipped at ' + assemblies[0].$!["run-time"]);
			}

			if (noOfTests > 0) {
				resolve(true);
			}
		}
		else {
			resolve(false);
		}
	});
	
}

//@ts-ignore
export function getDebugConfigurationsFromLaunchJson(launchJson) {
	let configurations = launchJson.configurations as Array<vscode.DebugConfiguration>;
	let debugConfigurations = configurations.filter(element => element.request === 'launch');
	return debugConfigurations;
}

export function getLaunchJson() {
	const launchPath = getWorkspaceFolder() + '\\.vscode\\launch.json';
	const data = readFileSync(launchPath, { encoding: 'utf-8' });
	return JSON.parse(data);
}

function getAppJsonKey(keyName: string) {
	const appJsonPath = getWorkspaceFolder() + '\\app.json';
	const data = readFileSync(appJsonPath, { encoding: 'utf-8' });
	const appJson = JSON.parse(data);
	return appJson[keyName];
}

function getALTestRunnerPath(): string {
	const alTestRunnerPath = getWorkspaceFolder() + '\\.altestrunner';
	return alTestRunnerPath;
}

function getLastResultPath(): string {
	return getALTestRunnerPath() + '\\last.xml';
}

function getWorkspaceFolder() {
	if (alTestRunnerAPI.getWorkspaceFolder) {
		let override = alTestRunnerAPI.getWorkspaceFolder.call(null);
		if (override && override.length > 0) {
			return override;
		}
	}

	const wsFolders = vscode.workspace.workspaceFolders!;
	if (wsFolders !== undefined) {
		if (wsFolders.length === 1) {
			return wsFolders.shift()!.uri.fsPath;
		}
	}

	if (activeEditor === undefined || activeEditor === null) {
		throw new Error('Please open a file in the project you want to run the tests for.');
	}
	else {
		const workspace = vscode.workspace.getWorkspaceFolder(activeEditor!.document.uri);
		if (workspace === undefined) {
			throw new Error('Please open a file in the project you want to run the tests for.');
		}
		return workspace!.uri.fsPath;
	}
}

function getALTestRunnerConfigPath(): string {
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

function setALTestRunnerConfig(keyName: string, keyValue: string | undefined) {
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
		newPSSessionOptions: ""
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

function callOnOutputTestResults(context: any) {
	if (alTestRunnerAPI.onOutputTestResults) {
		alTestRunnerAPI.onOutputTestResults.call(null, context);
	}
}

// this method is called when your extension is deactivated
export function deactivate() { }