import * as vscode from 'vscode';
import { getALObjectOfDocument, getALFileForALObject, getTestFolderPath } from './alFileHelper';
import { copyFileSync, existsSync, readFileSync } from 'fs';
import { ALFile, ALObject, CodeCoverageDisplay, CodeCoverageLine, CodeCoverageObject } from './types';
import { activeEditor, passingTestDecorationType, outputWriter } from './extension';
import { join, basename, dirname } from 'path';
import { getALTestRunnerConfig } from './config';

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

export function readCodeCoverage(codeCoverageDisplay?: CodeCoverageDisplay, testRun?: vscode.TestRun): Promise<CodeCoverageLine[]> {
    return new Promise(async (resolve) => {
        let codeCoverage: CodeCoverageLine[] = [];
        let codeCoveragePath;
        if (testRun) {
            codeCoveragePath = getCoveragePathForTestRun(testRun);
        }
        else {
            codeCoveragePath = await getCodeCoveragePath(codeCoverageDisplay);
        }
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
            const testFolderName = getTestFolderPath();
            if (testFolderName) {
                resolve(join(testFolderName, config.codeCoveragePath));
            }
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

export async function saveTestRunCoverage(testRun: vscode.TestRun): Promise<void> {
    return new Promise(async resolve => {
        const path = await getCodeCoveragePath(CodeCoverageDisplay.Previous);
        if (path) {
            let testRunCoveragePath = getCoveragePathForTestRun(testRun);
            copyFileSync(path, testRunCoveragePath);
        }
        resolve();
    });
}

function getCoveragePathForTestRun(testRun: vscode.TestRun): string {
    return join(require('os').tmpdir(), `codeCoverage${testRun.name}.json`);
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
    try {
        let config = getALTestRunnerConfig();
        return basename(config.codeCoveragePath);
    }
    catch {
        return ''
    }
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

function getCoverageObjectFromCodeCoverage(codeCoverage: CodeCoverageLine[], alFile: ALFile): CodeCoverageObject {
    let objectCoverage: CodeCoverageLine[] = filterCodeCoverageByObject(codeCoverage, alFile.object, true);
    let coverageObject: CodeCoverageObject = {
        file: alFile,
        noOfLines: objectCoverage.length,
        noOfHitLines: filterCodeCoverageByObject(objectCoverage, alFile.object, false).length
    };
    coverageObject.coverage = getCodeCoveragePercentageForCoverageObject(coverageObject);
    return coverageObject;
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
    codeCoverageStatusBarItem.command = { command: 'altestrunner.toggleCodeCoverage', title: 'Toggle Code Coverage' };
    updateCodeCoverageStatusBarItemText(codeCoverageStatusBarItem);
    return codeCoverageStatusBarItem;
}

function updateCodeCoverageStatusBarItemText(statusBarItem: vscode.StatusBarItem) {
    statusBarItem.text = `Code Coverage: ${codeCoverageDisplay}`;
    if (codeCoverageDisplay == CodeCoverageDisplay.Off) {
        statusBarItem.backgroundColor = undefined;
    }
    else {
        statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    }
    statusBarItem.show();
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

    updateCodeCoverageStatusBarItemText(codeCoverageStatusBarItem);
    updateCodeCoverageDecoration();
}

export function getALFilesInCoverage(codeCoverage: CodeCoverageLine[]): ALFile[] {
    let alFiles: ALFile[] = [];
    let alObjects: ALObject[] = getALObjectsFromCodeCoverage(codeCoverage);
    alObjects.forEach(alObject => {
        let alFile = getALFileForALObject(alObject);
        if (alFile) {
            alFiles.push(alFile);
        }
    });

    return alFiles;
}

export function getFileCoverage(codeCoverage: CodeCoverageLine[], alFile: ALFile): vscode.FileCoverage {
    let coverageObject: CodeCoverageObject = getCoverageObjectFromCodeCoverage(codeCoverage, alFile);
    return new vscode.FileCoverage(vscode.Uri.file(alFile.path), new vscode.TestCoverageCount(coverageObject.noOfHitLines, coverageObject.noOfLines));
}

export function getStatementCoverage(codeCoverage: CodeCoverageLine[], alFile: ALFile): vscode.StatementCoverage[] {
    let statementCoverage: vscode.StatementCoverage[] = [];
    if (alFile.object) {
        filterCodeCoverageByObject(codeCoverage, alFile.object, false).forEach(codeCoverageLine => {
            statementCoverage.push(new vscode.StatementCoverage(parseInt(codeCoverageLine.NoOfHits), new vscode.Range(parseInt(codeCoverageLine.LineNo) - 1, 0, parseInt(codeCoverageLine.LineNo) - 1, 0)));
        });
    }

    return statementCoverage;
}