import * as vscode from 'vscode';
import { getALObjectOfDocument } from './alFileHelper';
import { existsSync, readFileSync } from 'fs';
import { ALObject, CodeCoverageLine } from './types';
import { getWorkspaceFolder, activeEditor, passingTestDecorationType, outputChannel } from './extension';
import { join } from 'path';

export function updateCodeCoverageDecoration(show: Boolean) {
    if (!activeEditor) {
        return;
    }

    const document = activeEditor.document;
    let alObject = getALObjectOfDocument(document);

    if (!alObject) {
        return;
    }

    let testedRanges: vscode.Range[] = [];

    if (show) {
        let codeCoverage: CodeCoverageLine[] = readCodeCoverage();
        codeCoverage = filterCodeCoverageByObject(codeCoverage, alObject!);
        codeCoverage.forEach(element => {
            testedRanges.push(document.lineAt(parseInt(element.LineNo) - 1).range);
        });
    }

    activeEditor.setDecorations(passingTestDecorationType, testedRanges);
}

function readCodeCoverage(): CodeCoverageLine[] {
    let codeCoverage: CodeCoverageLine[] = [];
    let codeCoveragePath = getCodeCoveragePath();
    if (existsSync(codeCoveragePath)) {
        codeCoverage = JSON.parse(readFileSync(codeCoveragePath, { encoding: 'utf-8' }));
    }

    return codeCoverage;
}

export function getCodeCoveragePath(): string {
    let config = vscode.workspace.getConfiguration('al-test-runner');
    return join(getWorkspaceFolder(), config.codeCoveragePath);
}

function filterCodeCoverageByObject(codeCoverage: CodeCoverageLine[], alObject: ALObject, includeZeroHits: Boolean = false): CodeCoverageLine[] {
    return codeCoverage.filter((element) => {
        return ((element.ObjectType.toLowerCase() === alObject.type.toLowerCase()) &&
            (element.ObjectID === alObject.id.toString()) &&
            ((element.NoOfHits !== "0") || includeZeroHits) &&
            (element.LineNo !== "0") &&
            (element.LineType === "Code"));
    });
}

export function outputCodeCoverage() {
    outputChannel.appendLine(' ');
    outputChannel.appendLine('Code Coverage');
    outputChannel.appendLine('-------------');

    const codeCoverage: CodeCoverageLine[] = readCodeCoverage();
    const alObjects: ALObject[] = getALObjectsFromCodeCoverage(codeCoverage);
    alObjects.forEach(element => {
        outputChannel.appendLine(getALObjectNameFromCodeCoverage(codeCoverage, element) + ' ' + getCodeCoveragePercentageForALObject(codeCoverage, element) + '%');
    });
}

function getALObjectsFromCodeCoverage(codeCoverage: CodeCoverageLine[]): ALObject[] {
    let alObjects: ALObject[] = [];
    let currentObject: ALObject;
    let lastObject: ALObject;
    codeCoverage.forEach(element => {
        currentObject = getALObjectFromCodeCoverageLine(element);
        if (JSON.stringify(currentObject) != JSON.stringify(lastObject)) {
            lastObject = getALObjectFromCodeCoverageLine(element);
            alObjects.push(lastObject);
        }
    });

    return alObjects;
}

function getALObjectFromCodeCoverageLine(codeCoverageLine: CodeCoverageLine): ALObject {
    return { id: parseInt(codeCoverageLine.ObjectID), type: codeCoverageLine.ObjectType };
}

function getCodeCoveragePercentageForALObject(codeCoverage: CodeCoverageLine[], alObject: ALObject, ): Number {
    let objectCodeLines = filterCodeCoverageByObject(codeCoverage, alObject, true);
    let objectCoverage = filterCodeCoverageByObject(objectCodeLines, alObject);
    
    if (objectCodeLines.length == 0) {
        return 0;
    }
    else {
        return Math.round((objectCoverage.length / objectCodeLines.length) * 100);
    }
}

function getALObjectNameFromCodeCoverage(codeCoverage: CodeCoverageLine[], alObject: ALObject): string {
    let lineZero = codeCoverage.filter(element => {
        return ((element.ObjectType.toLowerCase() == alObject.type.toLowerCase()) &&
            (element.ObjectID == alObject.id.toString() &&
                (element.LineNo == "0")));
    });

    if (lineZero) {
        return lineZero.shift()!.Line.trim();
    }

    return '';
}