// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { isUndefined } from 'util';
import { readFileSync, writeFileSync, mkdirSync, existsSync, watch, readdirSync, unlinkSync } from 'fs';
import * as xml2js from 'xml2js';

type ALTestRunnerConfig = {
	launchConfigName: string;
	containerResultPath: string;
	userName: string;
	securePassword: string;
	companyName: string;
	testSuiteName: string;
};

type ALTestAssembly = {
	$: {
		time: string;
		skipped: string;
		failed: string;
		passed: string;
		total: string;
		'run-time': string;
		'run-date': string;
		'test-framework': string;
		name: string;
	};
	collection: ALTestCollection[];	
};

type ALTestCollection = {
	$: {
		time: string;
		skipped: string;
		failed: string;
		passed: string;
		total: string;
		name: string;
	};
	test: ALTestResult[];
};

type ALTestResult = {
	$: {
		method: string;
		name: string;
		result: string;
		time: string;
	};
	failure: [{
		message: string;
		'stack-trace': string
	}]
};

type ALTestMethodRange = {
	name: string;
	range: vscode.Range;
};

export function activate(context: vscode.ExtensionContext) {
	let timeout: NodeJS.Timer | undefined = undefined;
	let activeEditor = vscode.window.activeTextEditor;
	let isTestCodeunit: boolean;

	if (!(existsSync(getALTestRunnerPath()))) {
		mkdirSync(getALTestRunnerPath());
	}

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

	const outputChannel = vscode.window.createOutputChannel(getTerminalName());
	
	console.log('jamespearson.al-test-runner extension is activated');
	let terminal: vscode.Terminal;

	let command = vscode.commands.registerCommand('altestrunner.runAllTests', async () => {
		await readyToRunTests().then(ready => {
			if (ready) {
				invokeTestRunner('Invoke-ALTestRunner -Tests All');
			}
		});
	});

	context.subscriptions.push(command);

	command = vscode.commands.registerCommand('altestrunner.runTestsCodeunit', async () => {
		await readyToRunTests().then(ready => {
			if (ready) {
				invokeTestRunner('Invoke-ALTestRunner -Tests Codeunit -FileName "' + vscode.window.activeTextEditor!.document.fileName + '"');
			}
		});
	});

	context.subscriptions.push(command);

	command = vscode.commands.registerCommand('altestrunner.runTest', async () => {
		await readyToRunTests().then(ready => {
			if (ready) {
				invokeTestRunner('Invoke-ALTestRunner -Tests Test -FileName "' + vscode.window.activeTextEditor!.document.fileName + '" -SelectionStart ' + vscode.window.activeTextEditor!.selection.start.line);
			}
		});
	});

	context.subscriptions.push(command);

	command = vscode.commands.registerCommand('altestrunner.clearTestResults', async () => {
		if (existsSync(getALTestRunnerPath() + '\\Results')) {
			readdirSync(getALTestRunnerPath() + '\\Results').forEach(e => unlinkSync(getALTestRunnerPath() + '\\Results\\' + e));
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

	function invokeTestRunner(command: string) {
		terminal = getALTestRunnerTerminal(getTerminalName());
		terminal.sendText('cls');
		terminal.sendText(command);
		terminal.show(true);
	}

	function updateDecorations() {
		const config = vscode.workspace.getConfiguration('al-test-runner');

		let passingTests: vscode.DecorationOptions[] = [];
		let failingTests: vscode.DecorationOptions[] = [];
		let untestedTests: vscode.DecorationOptions[] = [];

		//call with empty arrays to clear all the decorations
		setDecorations(passingTests, failingTests, untestedTests);

		if (!(config.decorateTestMethods)) {
			setDecorations(passingTests, failingTests, untestedTests);
			return;
		}

		let testMethodRanges: ALTestMethodRange[] = getTestMethodRangesFromDocument(activeEditor!.document);

		let resultFileName = getALTestRunnerPath() + '\\Results\\' + getDocumentIdAndName(activeEditor!.document) + '.xml';
		if (!(existsSync(resultFileName))) {
			setDecorations(passingTests, failingTests, getUntestedTestDecorations(testMethodRanges));
			return;
		}

		const xmlParser = new xml2js.Parser();

		let resultXml = readFileSync(resultFileName, { encoding: 'utf-8' });
		xmlParser.parseStringPromise(resultXml).then(resultObj => {
			const collection = resultObj.assembly.collection;
			const tests = collection.shift()!.test as Array<ALTestResult>;

			const documentText = activeEditor!.document.getText();
			tests.forEach(test => {
				const matches = documentText.match('(?<=procedure )' + test.$.method);
				if (!(matches === undefined) && !(matches === null)) {
					const startPos = activeEditor!.document.positionAt(matches!.index!);
					const endPos = activeEditor!.document.positionAt(matches!.index! + matches![0].length);
					let methodName = documentText.substr(matches!.index!, matches![0].length);

					let arrayNo = testMethodRanges.findIndex(element => element.name === methodName);
					if (arrayNo >= 0) {
						testMethodRanges.splice(arrayNo, 1);
					}

					if (test.$.result === 'Pass') {
						const decoration: vscode.DecorationOptions = { range: new vscode.Range(startPos, endPos), hoverMessage: 'Test passing 👍' };
						passingTests.push(decoration);
					}
					else {
						const hoverMessage: string = test.failure[0].message + "\n\n" + test.failure[0]["stack-trace"];
						const decoration: vscode.DecorationOptions = { range: new vscode.Range(startPos, endPos), hoverMessage: hoverMessage };
						failingTests.push(decoration);
					}
				}
			});

			setDecorations(passingTests, failingTests, getUntestedTestDecorations(testMethodRanges));
		})
			.catch(err => {
				vscode.window.showErrorMessage(err);
			});
	}

	function setDecorations(passingTests: vscode.DecorationOptions[], failingTests: vscode.DecorationOptions[], untestedTests: vscode.DecorationOptions[]) {
		activeEditor!.setDecorations(passingTestDecorationType, passingTests);
		activeEditor!.setDecorations(failingTestDecorationType, failingTests);
		activeEditor!.setDecorations(untestedTestDecorationType, untestedTests);
	}

	function getUntestedTestDecorations(testMethodRanges: ALTestMethodRange[]): vscode.DecorationOptions[] {
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
		isTestCodeunit = getIsTestCodeunit(activeEditor.document);
		triggerUpdateDecorations();
	}

	vscode.window.onDidChangeActiveTextEditor(editor => {
		activeEditor = editor;
		if (editor) {
			isTestCodeunit = getIsTestCodeunit(activeEditor!.document);
			triggerUpdateDecorations();
		}
	}, null, context.subscriptions);

	vscode.workspace.onDidChangeTextDocument(event => {
		if (activeEditor && event.document === activeEditor.document) {
			triggerUpdateDecorations();
		}
	}, null, context.subscriptions);

	watch(getALTestRunnerPath(), (event, fileName) => {
		if (fileName === 'last.xml') {
			outputTestResults();
		}
		else {
			triggerUpdateDecorations();
		}
	});

	function getTestMethodRangesFromDocument(document: vscode.TextDocument): ALTestMethodRange[] {
		const documentText = document.getText();
		//const regEx = /\[Test\].*\n(^.*\n){0,3} *procedure .*\(/gm;
		const regEx = /\[Test\]/g;
		let testMethods: ALTestMethodRange[] = [];
		let match;

		while (match = regEx.exec(documentText)) {
			let subDocumentText = documentText.substr(match.index, 300);
			let methodMatch = subDocumentText.match('(?<=procedure ).*');
			if (methodMatch !== undefined) {
				const startPos = document.positionAt(match.index + methodMatch!.index!);
				const endPos = document.positionAt(match.index + methodMatch!.index! + methodMatch![0].length - 2);
				const testMethod: ALTestMethodRange = {
					name: subDocumentText.substr(methodMatch!.index!, methodMatch![0].length - 2),
					range: new vscode.Range(startPos, endPos)
				};
				testMethods.push(testMethod);
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

	function launchConfigIsValid(): boolean {
		let alTestRunnerConfig = getALTestRunnerConfig();
		if (alTestRunnerConfig.launchConfigName === '') {
			return false;
		}
		else {
			let debugConfigurations = getDebugConfigurationsFromLaunchJson(getLaunchJson());
			return debugConfigurations.filter(element => element.name === alTestRunnerConfig.launchConfigName).length === 1;
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

	function getIsTestCodeunit(document: vscode.TextDocument): boolean {
		if (document.fileName.substr(document.fileName.lastIndexOf('.')) !== '.al') {
			return false;
		}

		const text = document.getText(new vscode.Range(0, 0, 10, 0));
		return !(isUndefined(text.match('Subtype = Test;')));
	}

	function getDocumentIdAndName(document: vscode.TextDocument): string {
		let firstLine = document.getText(new vscode.Range(0, 0, 0, 250));
		let matches = firstLine.match('\\d+ .*');
		if (!(isUndefined(matches))) {
			return matches!.shift()!.replace(/"/g, '');
		}
		else {
			return '';
		}
	}

	function outputTestResults() {
		let resultFileName = getALTestRunnerPath() + '\\last.xml';
		if (existsSync(resultFileName)) {
			outputChannel.clear();
			outputChannel.show(true);

			const xmlParser = new xml2js.Parser();
			let resultXml = readFileSync(resultFileName, { encoding: 'utf-8' });
			xmlParser.parseStringPromise(resultXml).then(resultObj => {
				const assemblies: ALTestAssembly[] = resultObj.assemblies.assembly;
				assemblies.forEach(assembly => {
					const failed = parseInt(assembly.$.failed);
					if (failed > 0) {
						outputChannel.appendLine('❌ ' + assembly.$.name);
					}
					else {
						outputChannel.appendLine('✅ ' + assembly.$.name);
					}					
					assembly.collection[0].test.forEach(test => {
						if (test.$.result === 'Pass') {
							outputChannel.appendLine('\t✅ ' + test.$.method);
						}
						else {
							outputChannel.appendLine('\t❌ ' + test.$.method);
							outputChannel.appendLine('\t\t' + test.failure[0].message);
						}
					});
				});
			});
			
			unlinkSync(resultFileName);
		}
	}

	//@ts-ignore
	function getDebugConfigurationsFromLaunchJson(launchJson) {
		let configurations = launchJson.configurations as Array<vscode.DebugConfiguration>;
		let debugConfigurations = configurations.filter(element => element.request === 'launch');
		return debugConfigurations;
	}

	function getLaunchJson() {
		let wsFolders = vscode.workspace.workspaceFolders!;
		let rootFolder = wsFolders.shift();
		let launchPath = rootFolder!.uri.fsPath + '\\.vscode\\launch.json';
		let data = readFileSync(launchPath, { encoding: 'utf-8' });
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
			data = readFileSync(alTestRunnerConfigPath, { encoding: 'utf-8' });
		} catch (error) {
			createALTestRunnerConfig();
			data = readFileSync(alTestRunnerConfigPath, { encoding: 'utf-8' });
		}

		let alTestRunnerConfig = JSON.parse(data);
		return alTestRunnerConfig as ALTestRunnerConfig;
	}

	function setALTestRunnerConfig(keyName: string, keyValue: string | undefined) {
		let config = getALTestRunnerConfig();
		//@ts-ignore
		config[keyName] = keyValue;
		writeFileSync(getALTestRunnerConfigPath(), JSON.stringify(config), { encoding: 'utf-8' });
	}

	function createALTestRunnerConfig() {
		let config: ALTestRunnerConfig = {
			containerResultPath: "",
			launchConfigName: "",
			securePassword: "",
			userName: "",
			companyName: "",
			testSuiteName: ""
		};

		mkdirSync(getALTestRunnerPath(), { recursive: true });
		writeFileSync(getALTestRunnerConfigPath(), JSON.stringify(config), { encoding: 'utf-8' });
	}
}


// this method is called when your extension is deactivated
export function deactivate() { }
