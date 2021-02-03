import * as vscode from 'vscode';
import { getALObjectOfDocument } from './alFileHelper';
import { existsSync, readFileSync } from 'fs';
import { ALObject, CodeCoverageLine } from './types';
import { getWorkspaceFolder, activeEditor, passingTestDecorationType } from './extension';
import { join } from 'path';

export function toggleCodeCoverage(toggle: Boolean) {
    if (!activeEditor) {
        return;
    }

    const document = activeEditor.document;
    let alObject = getALObjectOfDocument(document);

    if (!alObject) {
        return;
    }

    let testedRanges: vscode.Range[] = [];
    let config = vscode.workspace.getConfiguration('al-test-runner');

    if (toggle) {
        let codeCoveragePath = join(getWorkspaceFolder(), config.codeCoveragePath);
        if (existsSync(codeCoveragePath)) {
            let codeCoverage: CodeCoverageLine[] = JSON.parse(readFileSync(codeCoveragePath, { encoding: 'utf-8' }));
            codeCoverage = filterCodeCoverageByObject(codeCoverage, alObject!);
            codeCoverage.forEach(element => {
                testedRanges.push(document.lineAt(parseInt(element.LineNo) - 1).range);
            });
        }
    }

    activeEditor.setDecorations(passingTestDecorationType, testedRanges);
}

function filterCodeCoverageByObject(codeCoverage: CodeCoverageLine[], alObject: ALObject): CodeCoverageLine[] {
    return codeCoverage.filter((element) => {
        return ((element.ObjectType.toLowerCase() === alObject.type.toLowerCase()) &&
            (element.ObjectID === alObject.id.toString()) &&
            ((element.NoOfHits !== "0") || (element.LineType !== "Code")) &&
            (element.LineNo !== "0"));
    });
}