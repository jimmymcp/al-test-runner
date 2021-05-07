import * as vscode from 'vscode';
import { getALObjectOfDocument, getALFileForALObject } from './alFileHelper';
import { existsSync, readFileSync } from 'fs';
import { ALObject, CodeCoverageLine, CodeCoverageObject } from './types';
import { activeEditor, passingTestDecorationType, outputChannel, getALTestRunnerConfig } from './extension';
import { join, basename } from 'path';
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
    let maxNoOfHitLinesLength: number = 0;
    let maxNoOfLinesLength: number = 0;

    for (let alObject of alObjects) {
        const alFile = getALFileForALObject(alObject);
        
        if (alFile && (!alFile.excludeFromCodeCoverage)) {
            let objectCoverage: CodeCoverageLine[] = filterCodeCoverageByObject(codeCoverage, alFile.object, true);
            let coverageObject: CodeCoverageObject = {
                file: alFile,
                noOfLines: objectCoverage.length,
                noOfHitLines: filterCodeCoverageByObject(objectCoverage, alObject, false).length
            };
            coverageObject.coverage = getCodeCoveragePercentageForCoverageObject(coverageObject);

            coverageObjects.push(coverageObject);
            if (alFile.object.name!.length > maxObjectNameLength) {
                maxObjectNameLength = alFile.object.name!.length;
            }
            if (alFile.object.type!.length > maxObjectTypeLength) {
                maxObjectTypeLength = alFile.object.type!.length;
            }
            if (coverageObject.noOfHitLines.toString().length > maxNoOfHitLinesLength) {
                maxNoOfHitLinesLength = coverageObject.noOfHitLines.toString().length;
            }
            if (coverageObject.noOfLines.toString().length > maxNoOfLinesLength) {
                maxNoOfLinesLength = coverageObject.noOfLines.toString().length;
            }
        }
    };

    
    if (coverageObjects) {
        coverageObjects.forEach(element => {
            outputChannel.appendLine(`${padString(element.coverage!.toString() + '%', 4)} | ${padString(element.noOfHitLines.toString(), maxNoOfHitLinesLength)} / ${padString(element.noOfLines.toString(), maxNoOfLinesLength)} | ${padString(element.file.object.type, maxObjectTypeLength)} | ${padString(element.file.object.name!, maxObjectNameLength)} | ${element.file.path}`);
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

function padLeft(string: string, length: number): string {
    let result = string;
    for (let i = result.length; i < length; i++) {
        result = ' ' + result;
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

function getCodeCoveragePercentageForCoverageObject(coverageObject: CodeCoverageObject): number {
    if (coverageObject.noOfLines == 0) {
        return 0;
    }
    else {
        return Math.round((coverageObject.noOfHitLines / coverageObject.noOfLines) * 100);
    }
}