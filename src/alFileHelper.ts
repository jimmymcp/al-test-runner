import * as vscode from 'vscode';
import { ALObject } from './types';

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