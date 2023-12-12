import * as vscode from 'vscode';
import { ALFile, ALMethodRange, ALObject, OutputType } from './types';
import { activeEditor, alFiles } from './extension';
import { readFileSync } from 'fs';
import { getCurrentWorkspaceConfig, getTestFolderFromConfig, getWorkspaceFolder } from './config';
import { join } from 'path';
import { objectDeclarationRegEx } from './constants';
import { sendDebugEvent } from './telemetry';
import { getOutputWriter, writeTable } from './output';
import * as types from './types';

export function getALObjectOfDocument(document: vscode.TextDocument): ALObject | undefined {
	const objectDeclaration = getObjectDeclarationFromDocument(document);
	if (objectDeclaration) {
		let ALObject: ALObject = {
			type: objectDeclaration.substr(0, objectDeclaration.indexOf(' ')),
			id: parseInt(objectDeclaration.substring(objectDeclaration.indexOf(' ') + 1)),
			name: getDocumentName(document)
		};
		return ALObject;
	}
	return undefined;
}

export function documentIsTestCodeunit(document: vscode.TextDocument): boolean {
	if (document.fileName.substring(document.fileName.lastIndexOf('.')) !== '.al') {
		return false;
	}

	const text = document.getText(new vscode.Range(0, 0, 10, 0));
	return (text.match('Sub(t|T)ype *= *(t|T)est;') !== null);
}

export function getDocumentIdAndName(document: vscode.TextDocument): string {
	const objectDeclaration = getObjectDeclarationFromDocument(document);
	if (objectDeclaration) {
		let matches = objectDeclaration.match('\\d+ .*');
		if (matches) {
			return matches.shift()!.replace(/"/g, '');
		}
	}

	return '';
}

function getObjectDeclarationFromDocument(document: vscode.TextDocument): string | undefined {
	const documentText = document.getText(new vscode.Range(0, 0, 10, 0));
	let matches = documentText.match(new RegExp(objectDeclarationRegEx, 'i'));
	if (matches) {
		return matches!.shift()!;
	}
}

export function getDocumentName(document: vscode.TextDocument): string {
	const idAndName = getDocumentIdAndName(document);
	return idAndName.substr(idAndName.indexOf(' ') + 1);
}

export async function getFilePathOfObject(object: ALObject, method?: string, files?: ALFile[]): Promise<string> {
	return new Promise(async resolve => {
		const alFile = getALFileForALObject(object, files);
		if (alFile) {
			const text = readFileSync(alFile.path, { encoding: 'utf-8' });
			const matches = text.match(`procedure.*${method}`);
			if (matches) {
				const document = await vscode.workspace.openTextDocument(alFile.path);
				const lineNo = document.positionAt(matches.index!).line + 1;
				resolve(`${alFile.path}:${lineNo}`);
			}
		}
	});
}

export async function getALFilesInWorkspace(excludePattern?: string, glob?: string): Promise<ALFile[]> {
	return new Promise(async (resolve) => {
		sendDebugEvent('getALFilesInWorkspace-start');
		let alFiles: ALFile[] = [];
		let files;
		if (glob) {
			files = await vscode.workspace.findFiles(glob);
		}
		else {
			files = await vscode.workspace.findFiles('**/*.al');
		}
		for (let file of files) {
			sendDebugEvent('getALFilesInWorkspace-openTextDocument', { "path": file.fsPath });
			const document = await vscode.workspace.openTextDocument(file);
			const alObject = getALObjectOfDocument(document);
			if (alObject) {
				alFiles.push({ object: alObject, path: file.fsPath, excludeFromCodeCoverage: excludePath(file.fsPath, excludePattern) });
			}
			else {
				sendDebugEvent('getALFilesInWorkspace-alObjectUndefined', { "path": file.fsPath })
			}
		};

		resolve(alFiles);
	});
}

function excludePath(path: string, excludePattern: string | undefined): boolean {
	if (!excludePattern) {
		return false;
	}

	if (path.match(excludePattern)) {
		return true;
	}
	return false;
}

export function getALFileForALObject(object: ALObject, files?: ALFile[]): ALFile | undefined {
	if (!files) {
		files = alFiles;
	}
	const filteredFiles = files.filter(file => {
		if (file.object) {
			if (object.name) {
				return file.object.type.toLowerCase() === object.type.toLowerCase() &&
					file.object.name === object.name;
			}
			else {
				return file.object.type.toLowerCase() === object.type.toLowerCase() &&
					file.object.id === object.id;
			}
		}
	});

	if (filteredFiles.length > 0) {
		return (filteredFiles.shift());
	}
	else {
		return undefined;
	}
}

export async function openEditorToTestFileIfNotAlready(): Promise<Boolean> {
	return new Promise(async resolve => {
		sendDebugEvent('openEditorToTestFileIfNotAlready-start');
		if (!activeEditorOpenToTestFile()) {
			if (await openTestAppJson()) {
				resolve(true);
			}
			else {
				resolve(false);
			}
		}
		else {
			resolve(false);
		}
	});
}

function activeEditorOpenToTestFile(): Boolean {
	if (!activeEditor) {
		return false;
	}

	const testFolderPath = getTestFolderPath();
	if (testFolderPath) {
		return activeEditor.document.uri.fsPath.includes(testFolderPath);
	}
	else {
		return false;
	}
}

async function openTestAppJson(): Promise<vscode.TextEditor | undefined> {
	return new Promise(async resolve => {
		const appJsonPath = getPathOfTestAppJson();
		if (appJsonPath) {
			vscode.commands.executeCommand('workbench.action.keepEditor');
			resolve(await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(appJsonPath)));
		}
		else {
			resolve(undefined);
		}
	});
}

function getPathOfTestAppJson(): string | undefined {
	const testFolderPath = getTestFolderPath();
	if (testFolderPath) {
		return join(testFolderPath, 'app.json');
	}
}

export function getTestFolderPath(): string | undefined {
	const config = getCurrentWorkspaceConfig(false);
	const testFolderFromConfig = getTestFolderFromConfig(config);

	if (testFolderFromConfig) {
		return testFolderFromConfig;
	}

	const workspaceFolder = getWorkspaceFolder();
	if (workspaceFolder) {
		return workspaceFolder;
	}
	
	vscode.window.showErrorMessage(`Could not find a test workspace folder with name "${config.testFolderName}". Please check the Test Folder Name setting.`, 'Open Settings').then(button => {
		if (button == 'Open Settings') {
			vscode.commands.executeCommand('workbench.action.openSettings2');
		}
	});
	return undefined;
}

export function activeEditorIsOpenToTestAppJson(): Boolean {
	if (!activeEditor) {
		return false;
	}

	return activeEditor.document.uri.fsPath === getPathOfTestAppJson();
}

export function getMethodNameFromDocumentAndLine(document: vscode.TextDocument, lineNumber: number): string {
	const line = document.lineAt(lineNumber - 1);
	return line.text.substring(line.text.indexOf('procedure ') + 'procedure '.length, line.text.indexOf('('));
}

export function getMethodRangesFromDocument(document: vscode.TextDocument): ALMethodRange[] {
	let alMethodRanges: ALMethodRange[] = [];
	const regEx = /(?:procedure )(\w*)(?:\()/gi;
	const text = document.getText();

	let match;
	while (match = regEx.exec(text)) {
		if (!documentLineIsCommentedOut(document, text, match.index)) {
			const alMethodRange: ALMethodRange = {
				name: match[1],
				range: new vscode.Range(document.positionAt(match.index), document.positionAt(match.index + match[1].length))
			};
			alMethodRanges.push(alMethodRange);
		}
	}

	return alMethodRanges;
}

export function getTestMethodRangesFromDocument(document: vscode.TextDocument): types.ALMethodRange[] {
	const documentText = document.getText();
	const regEx = /\[Test\]/gi;
	let testMethods: types.ALMethodRange[] = [];
	let match;

	while (match = regEx.exec(documentText)) {
		let subDocumentText: string = '';
		if (match.index + 1000 > documentText.length) {
			subDocumentText = documentText.substring(match.index);
		}
		else {
			subDocumentText = documentText.substring(match.index, match.index + 1000);
		}

		let methodMatch = subDocumentText.match('(?<=procedure ).*\\(');
		if (methodMatch !== undefined) {
			const startPos = document.positionAt(match.index + methodMatch!.index!);
			const endPos = document.positionAt(match.index + methodMatch!.index! + methodMatch![0].length - 1);

			if (!documentLineIsCommentedOut(document, documentText, match.index)) {
				const testMethod: types.ALMethodRange = {
					name: subDocumentText.substring(methodMatch!.index!, methodMatch!.index! + methodMatch![0].length - 1),
					range: new vscode.Range(startPos, endPos)
				};
				testMethods.push(testMethod);
			}
		}
	}

	return testMethods;
}

function documentLineIsCommentedOut(document: vscode.TextDocument, text: string, index: number): boolean {
	//if the line startsWith (excluding whitespace at the beginning of the line) // then it has been commented out
	const textLine = document.lineAt(document.positionAt(index).line);
	if (textLine.text.substring(textLine.firstNonWhitespaceCharacterIndex).startsWith('//')) {
		return true;
	}

	//if there is a match on /* before the line and not a */ after that match then the line has been block commented out
	const lastIndexBlockCommentStart = text.substring(0, index).lastIndexOf('/*');
	if (lastIndexBlockCommentStart > -1) {
		const lastIndexBlockCommentEnd = text.substring(lastIndexBlockCommentStart, index).lastIndexOf('*/');
		if (lastIndexBlockCommentEnd == -1) {
			return true;
		}
	}

	return false;
}

export async function listALFiles() {
	vscode.window.showInformationMessage('Reading AL files in workspace...');
	const outputEditor = getOutputWriter(OutputType.Editor);
	const startTime = new Date();
	let results: any[] = [];
	const files: ALFile[] = await getALFilesInWorkspace();
	files.forEach(file => {
		let result;
		if (file.object) {
			result = { path: file.path, type: file.object.type, id: file.object.id, name: file.object.name };
		}
		else {
			result = { path: file.path, type: 'undefined', id: 'undefined', name: 'undefined' };
		}
		results.push(result);
	});
	writeTable(outputEditor, results, ['path', 'type', 'id', 'name'], true, true);
	const endTime = new Date();
	outputEditor.write(`Started at: ${startTime.toTimeString()}`);
	outputEditor.write(`Ended at  : ${endTime.toTimeString()}`);
	outputEditor.show();
}