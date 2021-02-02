import * as vscode from 'vscode';
import { getALObjectOfDocument } from './alFileHelper';

export function toggleCodeCoverage(toggle: Boolean) {
    if (vscode.window.activeTextEditor !== undefined) {
        let currentObject = getALObjectOfDocument(vscode.window.activeTextEditor.document);
        vscode.window.showInformationMessage(currentObject!.type + " " + currentObject!.id);
    }
}