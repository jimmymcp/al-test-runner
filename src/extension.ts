// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { isUndefined } from 'util';
import { readFileSync, writeFileSync, mkdirSync, existsSync, watch, fstat, FSWatcher } from 'fs';
import * as xml2js from 'xml2js';
import { match } from 'minimatch';

type ALTestRunnerConfig = {
	launchConfigName: string;
	containerResultPath: string;
	userName: string;
	securePassword: string;
	companyName: string;
	testSuiteName: string;
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
}

const passingTestDecorationType = vscode.window.createTextEditorDecorationType({
	backgroundColor: 'rgba(0,255,0,0.3)'
});

const failingTestDecorationType = vscode.window.createTextEditorDecorationType({
	backgroundColor: 'rgba(255,97,97,0.3)'
});

const untestedTestDecorationType = vscode.window.createTextEditorDecorationType({
	backgroundColor: 'rgba(252,154,42,0.3)'
});

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	let timeout: NodeJS.Timer | undefined = undefined;
	let activeEditor = vscode.window.activeTextEditor;
	let isTestCodeunit: boolean;

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('jamespearson.al-test-runner extension is activated');
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
				terminal.sendText('Invoke-ALTestRunner -Tests Codeunit -FileName "' + vscode.window.activeTextEditor!.document.fileName + '"');
				terminal.show(true);
			}
		});
	});

	context.subscriptions.push(command);

	command = vscode.commands.registerCommand('altestrunner.runTest', async () => {
		await readyToRunTests().then(ready => {
			if (ready) {
				terminal = getALTestRunnerTerminal(getTerminalName());
				terminal.sendText('Invoke-ALTestRunner -Tests Test -FileName "' + vscode.window.activeTextEditor!.document.fileName + '" -SelectionStart ' + vscode.window.activeTextEditor!.selection.start.line);
				terminal.show(true);
			}
		});
	});

	context.subscriptions.push(command);

	function updateDecoraions() {
		let config = vscode.workspace.getConfiguration('al-test-runner');
		if (!(config.decorateTestMethods)) {
			return;
		}

		let resultFileName = getALTestRunnerPath() + '\\Results\\' + getDocumentIdAndName(activeEditor!.document) + '.xml';
		if (!(existsSync(resultFileName))) {
			return;
		}

		const xmlParser = new xml2js.Parser();

		let resultXml = readFileSync(resultFileName, { encoding: 'utf-8' });
		xmlParser.parseStringPromise(resultXml).then(resultObj => {
			const collection = resultObj.assembly.collection;
			const tests = collection.shift()!.test as Array<ALTestResult>;
			let passingTests: vscode.DecorationOptions[] = [];
			let failingTests: vscode.DecorationOptions[] = [];
			let untestedTests: vscode.DecorationOptions[] = [];
			let testMethodRanges: ALTestMethodRange[] = getTestMethodRangesFromDocument(activeEditor!.document);

			const documentText = activeEditor!.document.getText();
			tests.forEach(test => {
				const matches = documentText.match('(?<=procedure )' + test.$.method);
				if (!(matches === undefined)) {
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

			activeEditor!.setDecorations(passingTestDecorationType, passingTests);
			activeEditor!.setDecorations(failingTestDecorationType, failingTests);

			if (testMethodRanges.length > 0) {
				testMethodRanges.forEach(element => {
					const decoration: vscode.DecorationOptions = { range: element.range, hoverMessage: 'There are no results for this test 🤷‍♀️' };
					untestedTests.push(decoration);
				});
				activeEditor!.setDecorations(untestedTestDecorationType, untestedTests);
			}
		})
			.catch(err => {
				vscode.window.showErrorMessage(err);
			});
	}

	function triggerUpdateDecorations() {
		if (!isTestCodeunit) {
			return;
		}

		if (timeout) {
			clearTimeout(timeout);
			timeout = undefined;
		}

		timeout = setTimeout(updateDecoraions, 500);
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
		triggerUpdateDecorations();
	});
}

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


// this method is called when your extension is deactivated
export function deactivate() { }
