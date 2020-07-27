import * as vscode from 'vscode';
import {getTestMethodRangesFromDocument} from './extension';

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
                this.codeLenses.push(new vscode.CodeLens(testMethodRange.range, {title: "Run Test", command: "altestrunner.runTest"}));
                this.codeLenses.push(new vscode.CodeLens(testMethodRange.range, {title: "Debug Test", command: "altestrunner.debugTest"}));
            });

            if (this.codeLenses.push.length > 0) {
                this.codeLenses.push(new vscode.CodeLens(new vscode.Range(0,0,0,0)));
            }
        }

        return this.codeLenses;
    }

    public resolveCodeLens(codeLens: vscode.CodeLens, token: vscode.CancellationToken) {
        const config = vscode.workspace.getConfiguration('al-test-runner');
        if (!(config.enableCodeLens)) {
            return codeLens;
        }
        
        const activeEditor = vscode.window.activeTextEditor;
        const filename = activeEditor!.document.fileName;

        if (codeLens.range.start.line === 0) {
            codeLens.command = {
                title: "Run tests",
                command: "altestrunner.runTestsCodeunit",
                arguments: [filename],
                tooltip: "Run all tests in this codeunit with AL Test Runner"
            };
        }
        else {
            const rangeStart = codeLens.range.start.line;
            if (codeLens.command!.title === "Run Test") {
                codeLens.command = {
                    title: "Run test",
                    command: "altestrunner.runTest",
                    arguments: [filename, rangeStart],
                    tooltip: "Run this test with AL Test Runner"
                };
            }
            else {
                codeLens.command = {
                    title: "Debug test",
                    command: "altestrunner.debugTest",
                    arguments: [filename, rangeStart],
                    tooltip: "Debug this test with AL Test Runner"
                };
            }
        }

        return codeLens;
    }
}