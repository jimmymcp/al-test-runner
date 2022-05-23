import * as vscode from 'vscode';
import { getALObjectOfDocument, getALFileForALObject } from './alFileHelper';
import { copyFileSync, existsSync, readFileSync } from 'fs';
import { ALObject, CodeCoverageDisplay, CodeCoverageLine, CodeCoverageObject } from './types';
import { activeEditor, passingTestDecorationType, outputWriter } from './extension';
import { join, basename, dirname } from 'path';
import { getALTestRunnerConfig, getTestWorkspaceFolder } from './config';
import { padString, writeTable } from './output';

let codeCoverageStatusBarItem: vscode.StatusBarItem;
let codeCoverageDisplay: CodeCoverageDisplay = CodeCoverageDisplay.Off;

export async function updateCodeCoverageDecoration() {
    if (!activeEditor) {
        return;
    }

    const document = activeEditor.document;
    let alObject = getALObjectOfDocument(document);

    if (!alObject) {
        return;
    }

    let testedRanges: vscode.Range[] = [];

    if (codeCoverageDisplay != CodeCoverageDisplay.Off) {
        let codeCoverage: CodeCoverageLine[] = await readCodeCoverage(codeCoverageDisplay);
        codeCoverage = filterCodeCoverageByObject(codeCoverage, alObject!);
        codeCoverage.forEach(element => {
            testedRanges.push(document.lineAt(parseInt(element.LineNo) - 1).range);
        });
    }

    activeEditor.setDecorations(passingTestDecorationType, testedRanges);
}

export function readCodeCoverage(codeCoverageDisplay?: CodeCoverageDisplay): Promise<CodeCoverageLine[]> {
    return new Promise(async (resolve) => {
        let codeCoverage: CodeCoverageLine[] = [];
        let codeCoveragePath = await getCodeCoveragePath(codeCoverageDisplay);
        if (codeCoveragePath) {
            if (existsSync(codeCoveragePath)) {
                codeCoverage = JSON.parse(readFileSync(codeCoveragePath, { encoding: 'utf-8' }));
            }
        }

        resolve(codeCoverage);
    });
}

export async function getCodeCoveragePath(codeCoverageType?: CodeCoverageDisplay): Promise<string | null> {
    return new Promise(async (resolve) => {
        if (codeCoverageType == CodeCoverageDisplay.All) {
            const path = await getCodeCoveragePath(CodeCoverageDisplay.Previous);
            if (path) {
                resolve(join(dirname(path), 'codeCoverageAll.json'));
            }
        }
        let config = vscode.workspace.getConfiguration('al-test-runner');
        if (config.codeCoveragePath) {
            resolve(join(getTestWorkspaceFolder(), config.codeCoveragePath));
        }
        else {
            let discoveredPath = await discoverCodeCoveragePath();
            resolve(discoveredPath);
        }
    });
}

export async function saveAllTestsCodeCoverage(): Promise<void> {
    return new Promise(async () => {
        const path = await getCodeCoveragePath(CodeCoverageDisplay.Previous);
        if (path) {
            const allTestsPath = await getCodeCoveragePath(CodeCoverageDisplay.All);
            if (allTestsPath) {
                copyFileSync(path, allTestsPath);
            }
        }
    });
}

async function discoverCodeCoveragePath(): Promise<string | null> {
    return new Promise(async (resolve, reject) => {
        let codeCoverageFiles = await vscode.workspace.findFiles(`**/**${getCodeCoverageFileName()}`);
        if (codeCoverageFiles.length > 0) {
            let codeCoveragePath = codeCoverageFiles.shift()!.fsPath;
            resolve(codeCoveragePath);
        }
        else {
            resolve(null);
        }
    });
}

function getCodeCoverageFileName(): string {
    let config = getALTestRunnerConfig();
    return basename(config.codeCoveragePath);
}

export function filterCodeCoverageByObject(codeCoverage: CodeCoverageLine[], alObject: ALObject, includeZeroHits: Boolean = false): CodeCoverageLine[] {
    return codeCoverage.filter((element) => {
        return ((element.ObjectType.toLowerCase() === alObject.type.toLowerCase()) &&
            (parseInt(element.ObjectID) === alObject.id) &&
            ((parseInt(element.NoOfHits) !== 0) || includeZeroHits) &&
            (parseInt(element.LineNo) !== 0) &&
            (element.LineType === "Code"));
    });
}

export function filterCodeCoverageByLineNoRange(codeCoverage: CodeCoverageLine[], startLineNumber: number, endLineNumber: number, includeZeroHits: boolean = false): CodeCoverageLine[] {
    return codeCoverage.filter(element => {
        const lineNumber = parseInt(element.LineNo);
        return (lineNumber >= startLineNumber && lineNumber <= endLineNumber &&
            (parseInt(element.NoOfHits) !== 0 || includeZeroHits) &&
            (element.LineType === "Code"));
    });
}

export async function outputCodeCoverage() {
    const codeCoverage: CodeCoverageLine[] = await readCodeCoverage();
    let alObjects: ALObject[] = getALObjectsFromCodeCoverage(codeCoverage);
    let coverageObjects: CodeCoverageObject[] = [];
    let maxNoOfHitLinesLength: number = 0;
    let maxNoOfLinesLength: number = 0;
    let totalLinesHit: number = 0;
    let totalLines: number = 0;
    let totalCodeCoverage: number = 0;
    let codeCoverageOutput: any[] = [];

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
            totalLines += coverageObject.noOfLines;
            totalLinesHit += coverageObject.noOfHitLines;

            coverageObjects.push(coverageObject);
            if (coverageObject.noOfHitLines.toString().length > maxNoOfHitLinesLength) {
                maxNoOfHitLinesLength = coverageObject.noOfHitLines.toString().length;
            }
            if (coverageObject.noOfLines.toString().length > maxNoOfLinesLength) {
                maxNoOfLinesLength = coverageObject.noOfLines.toString().length;
            }
        }
    };

    if (totalLines !== 0) {
        totalCodeCoverage = Math.round((totalLinesHit / totalLines) * 100);
    }

    const codeCoverageSummary = `Code Coverage ${totalCodeCoverage}% (${totalLinesHit}/${totalLines})`;

    coverageObjects.forEach(element => {
        codeCoverageOutput.push({
            coverage: element.coverage!.toString() + '%',
            hitLines: `${padString(element.noOfHitLines.toString(), maxNoOfHitLinesLength)} / ${padString(element.noOfLines.toString(), maxNoOfLinesLength)}`,
            type: element.file.object.type,
            name: element.file.object.name!,
            path: element.file.path
        });
    });

    writeTable(outputWriter, codeCoverageOutput, ['coverage', 'hitLines', 'type', 'name', 'path'], false, false, codeCoverageSummary);
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
    return getCodeCoveragePercentage(coverageObject.noOfHitLines, coverageObject.noOfLines);
}

export function getCodeCoveragePercentage(hitLines: number, totalLines: number): number {
    if (totalLines == 0) {
        return 0
    }
    else {
        return Math.round(hitLines / totalLines * 100);
    }
}

export function createCodeCoverageStatusBarItem(): vscode.StatusBarItem {
    codeCoverageStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right);
    codeCoverageStatusBarItem.command = 'altestrunner.toggleCodeCoverage';
    updateCodeCoverageStatusBarItemText();
    return codeCoverageStatusBarItem;
}

function updateCodeCoverageStatusBarItemText() {
    codeCoverageStatusBarItem.text = `Code Coverage: ${codeCoverageDisplay}`;
    if (codeCoverageDisplay == CodeCoverageDisplay.Off) {
        codeCoverageStatusBarItem.backgroundColor = undefined;
    }
    else {
        codeCoverageStatusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    }
    codeCoverageStatusBarItem.show();
}

export function toggleCodeCoverageDisplay(newCodeCoverageDisplay?: CodeCoverageDisplay) {
    if (newCodeCoverageDisplay) {
        if (codeCoverageDisplay == newCodeCoverageDisplay) {
            //so the user can click the coverage % code lens a second time to turn the coverage off
            codeCoverageDisplay = CodeCoverageDisplay.Off;
        }
        else {
            codeCoverageDisplay = newCodeCoverageDisplay
        }
    }
    else {
        switch (codeCoverageDisplay) {
            case CodeCoverageDisplay.Off:
                codeCoverageDisplay = CodeCoverageDisplay.Previous
                break;
            case CodeCoverageDisplay.Previous:
                codeCoverageDisplay = CodeCoverageDisplay.All;
                break;
            default:
                codeCoverageDisplay = CodeCoverageDisplay.Off;
                break;
        }
    }

    updateCodeCoverageStatusBarItemText();
    updateCodeCoverageDecoration();
}