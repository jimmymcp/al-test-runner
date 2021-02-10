import * as vscode from 'vscode';
import { getALObjectOfDocument, getALFileForALObject } from './alFileHelper';
import { existsSync, readFileSync } from 'fs';
import { ALObject, CodeCoverageLine, CodeCoverageObject } from './types';
import { activeEditor, passingTestDecorationType, outputChannel } from './extension';
import { join } from 'path';
import { getTestWorkspaceFolder } from './config';

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
    return join(getTestWorkspaceFolder(), config.codeCoveragePath);
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

export async function outputCodeCoverage() {
    outputChannel.appendLine(' ');
    outputChannel.appendLine('Code Coverage');
    outputChannel.appendLine('-------------');

    const codeCoverage: CodeCoverageLine[] = readCodeCoverage();
    let alObjects: ALObject[] = getALObjectsFromCodeCoverage(codeCoverage);
    let coverageObjects: CodeCoverageObject[] = [];
    let maxObjectNameLength: number = 0;
    let maxObjectTypeLength: number = 0;
    let maxObjectIDLength: number = 0;
    for (let alObject of alObjects) {
        const alFile = getALFileForALObject(alObject);
        
        if (alFile) {
            coverageObjects.push({ file: alFile, coverage: getCodeCoveragePercentageForALObject(codeCoverage, alObject) });
            if (alFile.object.name!.length > maxObjectNameLength) {
                maxObjectNameLength = alFile.object.name!.length;
            }
            if (alFile.object.type!.length > maxObjectTypeLength) {
                maxObjectTypeLength = alFile.object.type!.length;
            }
            if (alFile.object.id.toString().length > maxObjectIDLength) {
                maxObjectIDLength = alFile.object.id.toString().length;
            }
        }
    };

    
    if (coverageObjects) {
        coverageObjects.forEach(element => {
            outputChannel.appendLine(`${padString(element.coverage.toString() + '%', 4)} | ${padString(element.file.object.type, maxObjectTypeLength)} | ${padString(element.file.object.id.toString(), maxObjectIDLength)} | ${padString(element.file.object.name!, maxObjectNameLength)} | ${element.file.path}`);
        });
    }
}

function padString(string: string, length: number): string {
    let result = string;
    for (let i = result.length; i < length; i++) {
        result += ' ';
    }
    return result;
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

function getCodeCoveragePercentageForALObject(codeCoverage: CodeCoverageLine[], alObject: ALObject, ): number {
    let objectCodeLines = filterCodeCoverageByObject(codeCoverage, alObject, true);
    let objectCoverage = filterCodeCoverageByObject(objectCodeLines, alObject);
    
    if (objectCodeLines.length == 0) {
        return 0;
    }
    else {
        return Math.round((objectCoverage.length / objectCodeLines.length) * 100);
    }
}