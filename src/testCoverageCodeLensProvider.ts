import * as vscode from 'vscode';
import { documentIsTestCodeunit, getDocumentName, getMethodRangesFromDocument } from './alFileHelper';
import { getCurrentWorkspaceConfig } from './config';
import { getTestCoverageForMethod } from './testCoverage';
import { ALMethod } from './types';

export class TestCoverageCodeLensProvider implements vscode.CodeLensProvider {
    private codeLenses: vscode.CodeLens[] = [];

    public async provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken): Promise<vscode.CodeLens[]> {
        this.codeLenses = [];

        if (!(document.fileName.endsWith('.al'))) {
            return this.codeLenses;
        }

        if (documentIsTestCodeunit(document)) {
            return this.codeLenses;
        }

        // Check for cancellation before expensive operations
        if (token.isCancellationRequested) {
            return this.codeLenses;
        }

        const objectName = getDocumentName(document);

        if (getCurrentWorkspaceConfig().enableCodeLens) {
            for (const methodRange of getMethodRangesFromDocument(document)) {
                // Check for cancellation within loop
                if (token.isCancellationRequested) {
                    break;
                }

                const method: ALMethod = { objectName: objectName, methodName: methodRange.name };
                const testCoverages = await getTestCoverageForMethod(method);
                const testCount = testCoverages.length;
                if (testCount > 0) {
                    let title: string = `${testCount} test`;
                    if (testCount != 1) {
                        title = title + 's';
                    };

                    this.codeLenses.push(new vscode.CodeLens(methodRange.range, { title: `Run ${title}`, command: "altestrunner.runRelatedTests", arguments: [method] }));
                    this.codeLenses.push(new vscode.CodeLens(methodRange.range, { title: `Show ${title}`, command: "altestrunner.showRelatedTests", arguments: [method] }));
                }
            }
        }

        return this.codeLenses;
    }
}