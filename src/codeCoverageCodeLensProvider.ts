import * as vscode from 'vscode';
import { documentIsTestCodeunit, getALObjectOfDocument, getMethodRangesFromDocument } from './alFileHelper';
import { filterCodeCoverageByLineNoRange, filterCodeCoverageByObject, getCodeCoveragePercentage, readCodeCoverage } from './coverage';
import { getCurrentWorkspaceConfig } from './config';
import { CodeCoverageDisplay, CodeCoverageLine } from './types';

export class CodeCoverageCodeLensProvider implements vscode.CodeLensProvider {
    private codeLenses: vscode.CodeLens[] = [];

    public provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.CodeLens[] | Thenable<vscode.CodeLens[]> {
        this.codeLenses = [];

        return new Promise(resolve => {

            if (!document.fileName.endsWith('.al')) {
                resolve(this.codeLenses);
            }

            if (documentIsTestCodeunit(document)) {
                resolve(this.codeLenses);
            }

            if (getCurrentWorkspaceConfig().enableCodeLens) {
                const alObject = getALObjectOfDocument(document);
                if (alObject) {
                    readCodeCoverage(CodeCoverageDisplay.All).then(allCodeCoverage => {
                        const objectCodeCoverage: CodeCoverageLine[] = filterCodeCoverageByObject(allCodeCoverage, alObject, true);
                        const methodRanges = getMethodRangesFromDocument(document);
                        methodRanges.forEach((methodRange, index) => {
                            let endLineNumber: number;
                            if (index == methodRanges.length - 1) {
                                endLineNumber = 99999;
                            }
                            else {
                                endLineNumber = methodRanges[index + 1].range.start.line - 1;
                            }
                            const startLineNumber = methodRange.range.start.line;
                            const totalLines: number = filterCodeCoverageByLineNoRange(objectCodeCoverage, startLineNumber, endLineNumber, true).length;
                            const hitLines: number = filterCodeCoverageByLineNoRange(objectCodeCoverage, startLineNumber, endLineNumber, false).length;
                        
                            this.codeLenses.push(new vscode.CodeLens(methodRange.range, { title: `${getCodeCoveragePercentage(hitLines, totalLines)}% Coverage`, command: 'altestrunner.toggleCodeCoverage', arguments: [CodeCoverageDisplay.All] }));

                            if (index == methodRanges.length - 1) {
                                resolve(this.codeLenses);
                            }
                        });
                    })
                }
            }
        });
    }
}