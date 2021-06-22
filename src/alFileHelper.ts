import * as vscode from 'vscode';
import { ALFile, ALObject } from './types';
import { alFiles } from './extension';
import { createReadStream, readFileSync } from 'fs';
import { createInterface } from 'readline';

export function getALObjectOfDocument(document: vscode.TextDocument): ALObject | undefined {
	let documentText = document.getText(new vscode.Range(0, 0, 1, 0));
	const pattern = '\\D* \\d* ';
	let matches = documentText.match(pattern);
	if (matches !== null) {
		let match = matches!.shift();
		let ALObject: ALObject = {
			type: match!.substr(0, match!.indexOf(' ')),
			id: parseInt(match!.substring(match!.indexOf(' ') + 1, match!.length - 1))
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

export async function getALFilesInWorkspace(excludePattern: string | undefined): Promise<ALFile[]> {
	return new Promise(async (resolve) => {
		let alFiles: ALFile[] = [];
		const files = await vscode.workspace.findFiles('**/*.al');
		for (let file of files) {
			const line = await getFirstLine(file.fsPath);
			let positionOfSpace = line.indexOf(' ');
			let positionOfSecondSpace = line.indexOf(' ', positionOfSpace + 1);
			let objectName = line.substr(positionOfSecondSpace + 1);
			if (objectName.includes('extends')) {
				objectName = objectName.substr(0, objectName.indexOf('extends') - 1);
			}
			else if (objectName.includes('implements')) {
				objectName = objectName.substr(0, objectName.indexOf('implements') - 1);
			}
			objectName = objectName.trim();
			
			const alObject: ALObject = {
				type: line.substr(0, positionOfSpace),
				id: parseInt(line.substring(positionOfSpace + 1, positionOfSecondSpace)),
				name: objectName
			};
			alFiles.push({ object: alObject, path: file.fsPath, excludeFromCodeCoverage: excludePath(file.fsPath, excludePattern) });
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

async function getFirstLine(pathToFile: string): Promise<string> {
	const readable = createReadStream(pathToFile);
	const reader = createInterface({ input: readable });
	const line: string = await new Promise((resolve) => {
		reader.on('line', (line) => {
			reader.close();
			resolve(line);
		});
	});
	readable.close();
	return line;
}

export function getALFileForALObject(alObject: ALObject): ALFile | undefined {
	const filteredFiles = alFiles.filter(file => {
		return ((file.object.type.toLowerCase() === alObject.type.toLowerCase()) &&
			(file.object.id === alObject.id));
	});

	if (filteredFiles.length > 0) {
		return (filteredFiles.shift());
	}
	else {
		return undefined;
	}
}