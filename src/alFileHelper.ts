import * as vscode from 'vscode';
import { ALObject } from './types';
import { getCurrentWorkspaceConfig } from './extension';
import { readFileSync} from 'fs';

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
	return new Promise(async (resolve, reject) => {
		const config = getCurrentWorkspaceConfig();
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
					if (matches !== null) {
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