import * as vscode from 'vscode';
import { getTestMethodRangesFromDocument } from './extension';

export class CodelensProvider implements vscode.CodeLensProvider {
    private codeLenses: vscode.CodeLens[] = [];

    public provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.CodeLens[] | Thenable<vscode.CodeLens[]> {
        this.codeLenses = [];

        if (!(document.fileName.endsWith('.al'))) {
            return this.codeLenses;
        }

        const config = vscode.workspace.getConfiguration('al-test-runner');
        if (config.enableCodeLens) {
            const testMethodRanges = getTestMethodRangesFromDocument(document);
            testMethodRanges.forEach(testMethodRange => {
                this.codeLenses.push(new vscode.CodeLens(testMethodRange.range, { title: "Run Test", command: "altestrunner.runTest", arguments: [document.fileName, testMethodRange.range.start.line], tooltip: "Run this test with AL Test Runner" }));
                this.codeLenses.push(new vscode.CodeLens(testMethodRange.range, { title: "Debug Test", command: "altestrunner.debugTest", arguments: [document.fileName, testMethodRange.range.start.line], tooltip: "Debug this test with AL Test Runner" }));
            });

            if (this.codeLenses.push.length > 0) {
                this.codeLenses.push(new vscode.CodeLens(new vscode.Range(0, 0, 0, 0), { title: "Run Tests", command: "altestrunner.runTestsCodeunit", arguments: [document.fileName], tooltip: "Run all tests in this codeunit with AL Test Runner" }));
            }
        }

        return this.codeLenses;
    }
}