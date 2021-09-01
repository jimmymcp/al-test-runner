import * as vscode from 'vscode';
import { ALFile, ALObject } from './types';
import { alFiles } from './extension';
import { readFileSync } from 'fs';

export function getALObjectOfDocument(document: vscode.TextDocument): ALObject | undefined {
	let documentText = document.getText(new vscode.Range(0, 0, 1, 0));
	const pattern = '\\D* \\d* ';
	let matches = documentText.match(pattern);
	if (matches !== null) {
		let match = matches!.shift();
		let ALObject: ALObject = {
			type: match!.substr(0, match!.indexOf(' ')),
			id: parseInt(match!.substring(match!.indexOf(' ') + 1, match!.length - 1)),
			name: getDocumentName(document)
		};
		return ALObject;
	}
	return undefined;
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
	if (matches !== undefined) {
		return matches!.shift()!.replace(/"/g, '');
	}
	else {
		return '';
	}
}

function getDocumentName(document: vscode.TextDocument): string {
	const idAndName = getDocumentIdAndName(document);
	return idAndName.substr(idAndName.indexOf(' ') + 1);
}

export async function getFilePathByCodeunitId(codeunitId: number, method?: string): Promise<string> {
	return new Promise(async resolve => {
		const alFile = getALFileForALObject({ type: 'codeunit', id: codeunitId });
		if (alFile) {
			const text = readFileSync(alFile.path, { encoding: 'utf-8' });
			const matches = text.match('procedure.*' + method);
			if (matches !== null) {
				const document = await vscode.workspace.openTextDocument(alFile.path);
				const lineNo = document.positionAt(matches!.index!).line + 1;
				resolve(alFile.path + ':' + lineNo);
			}
		}

		resolve('could not find codeunit ' + codeunitId);
	});
}

export async function getALFilesInWorkspace(excludePattern?: string, glob?: string): Promise<ALFile[]> {
	return new Promise(async (resolve) => {
		let alFiles: ALFile[] = [];
		let files;
		if (glob) {
			files = await vscode.workspace.findFiles(glob);
		}
		else {
			files = await vscode.workspace.findFiles('**/*.al');
		}
		for (let file of files) {
			const document = await vscode.workspace.openTextDocument(file);
			const alObject = getALObjectOfDocument(document);
			alFiles.push({ object: alObject!, path: file.fsPath, excludeFromCodeCoverage: excludePath(file.fsPath, excludePattern) });
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

export function getALFileForALObject(alObject: ALObject): ALFile | undefined {
	const filteredFiles = alFiles.filter(file => {
		if (file.object) {
			return ((file.object.type.toLowerCase() === alObject.type.toLowerCase()) &&
				(file.object.id === alObject.id));
		}
	});

	if (filteredFiles.length > 0) {
		return (filteredFiles.shift());
	}
	else {
		return undefined;
	}
}