import * as vscode from 'vscode';
import { getMethodNameFromDocumentAndLine } from './alFileHelper';
import { getCodeCoveragePath, readCodeCoverage } from './CodeCoverage';
import { alFiles, channelWriter } from "./extension";
import { ALFile, ALMethod, CodeCoverageLine, TestCoverage } from "./types";
import { join, dirname } from 'path'
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { writeTable } from './output';
import { getTestItemForMethod, runTestHandler } from './testController';

export let testCoverage: TestCoverage[] = [];
readTestCoverage();

export async function buildTestCoverageFromTestItem(testItem: vscode.TestItem): Promise<void> {
    return new Promise(async resolve => {
        const testMethod: ALMethod = { objectName: testItem.parent!.label, methodName: testItem.label };
        const codeCoverage = await readCodeCoverage();
        buildTestCoverage(codeCoverage, testMethod).then(newCoverage => {
            writeTestCoverage(testMethod, newCoverage);
        });
        resolve();
    })
}

async function writeTestCoverage(testMethod: ALMethod, newCoverage: TestCoverage[]): Promise<void> {
    return new Promise(async resolve => {
        const path = await getTestCoveragePath();
        let existingCoverage = excludeCoverageForMethod(testMethod);
        const mergedCoverage = addNewCoverage(existingCoverage, newCoverage);
        writeFileSync(path, JSON.stringify(mergedCoverage, null, 2));
        testCoverage = mergedCoverage;
        resolve();
    });
}

function excludeCoverageForMethod(method: ALMethod): TestCoverage[] {
    return testCoverage.filter(test => {
        return (test.testMethod.objectName !== method.objectName || test.testMethod.methodName !== method.methodName);
    });
}

function addNewCoverage(existingCoverage: TestCoverage[], newCoverage: TestCoverage[]): TestCoverage[] {
    newCoverage.forEach(element => {
        existingCoverage.push(element);
    });

    return existingCoverage;
}

export async function readTestCoverage(): Promise<void> {
    return new Promise(async resolve => {
        const path = await getTestCoveragePath();
        if (existsSync(path)) {
            const text = readFileSync(path, { encoding: 'utf-8' });
            testCoverage = JSON.parse(text);
        }
        else {
            testCoverage = [];
        }
        resolve();
    });
}

async function getTestCoveragePath(): Promise<string> {
    return new Promise(async resolve => {
        const codeCoveragePath = await getCodeCoveragePath();
        if (codeCoveragePath) {
            resolve(join(dirname(codeCoveragePath), 'testCoverage.json'));
        }
    });
}

export function buildTestCoverage(codeCoverage: CodeCoverageLine[], testMethod: ALMethod): Promise<TestCoverage[]> {
    return new Promise(resolve => {
        let thisCoverage: TestCoverage[] = [];
        let methodIncluded: boolean = false;

        codeCoverage.forEach(async (line, index) => {
            if (!methodIncluded) {
                if (parseInt(line.NoOfHits) != 0) {
                    const methodLine = getPreviousMethodLine(codeCoverage, index);
                    if (methodLine) {
                        methodIncluded = true;
                        const alFile = getALFileForCodeCoverageLine(line);
                        if (alFile) {
                            if (!alFile.excludeFromCodeCoverage) {
                                const document = await vscode.workspace.openTextDocument(alFile.path);
                                const methodName = await getMethodNameFromDocumentAndLine(document, parseInt(methodLine.LineNo));
                                const test: TestCoverage = {
                                    method: { objectName: alFile.object.name!, methodName: methodName, object: alFile.object },
                                    testMethod: testMethod
                                }
                                thisCoverage.push(test);
                            }
                        }
                    }
                }
            }

            if (line.LineType == 'Trigger/Function') {
                methodIncluded = false;
            }

            if (index == codeCoverage.length - 1) {
                resolve(thisCoverage);
            }
        });
    });
}

function getALFileForCodeCoverageLine(codeCoverageLine: CodeCoverageLine): ALFile | undefined {
    const matchingFiles = alFiles.filter(file => {
        if (file.object) {
            return (file.object.id == parseInt(codeCoverageLine.ObjectID) && file.object.type == codeCoverageLine.ObjectType.toLowerCase())
        }
    });

    if (matchingFiles) {
        return matchingFiles[0];
    }
}

function getPreviousMethodLine(codeCoverage: CodeCoverageLine[], index: number): CodeCoverageLine | undefined {
    for (let i: number = index - 1; i >= 0; i--) {
        if (codeCoverage[i].LineType === 'Trigger/Function') {
            return codeCoverage[i];
        }
    }
}

export function getTestCoverageForMethod(method: ALMethod): TestCoverage[] {
    return testCoverage.filter(element => {
        return (element.method.objectName == method.objectName && element.method.methodName == method.methodName);
    });
}

export function showRelatedTests(method?: ALMethod) {
    if (!method) {
        return;
    }

    const relatedTestMethods: any[] = getRelatedTests(method);
    writeTable(channelWriter, relatedTestMethods, ["objectName", "methodName"], true, true, `${method.objectName}.${method.methodName} tested by:`, ["Codeunit", "Test"]);
    channelWriter.show();
}

export function runRelatedTests(method?: ALMethod) {
    if (!method) {
        return;
    }

    let testItems: vscode.TestItem[] = [];
    getRelatedTests(method).forEach(test => {
        const testItem = getTestItemForMethod(test);
        if (testItem) {
            testItems.push(testItem);
        }
    });

    if (testItems.length > 0) {
        vscode.window.showInformationMessage(`Running ${testItems.length} test(s) related to ${method.methodName}`);
        const request = new vscode.TestRunRequest(testItems);
        runTestHandler(request);
    }
}

function getRelatedTests(method: ALMethod): ALMethod[] {
    let relatedTestMethods: ALMethod[] = [];
    getTestCoverageForMethod(method).forEach(testCoverage => {
        relatedTestMethods.push({ objectName: testCoverage.testMethod.objectName, methodName: testCoverage.testMethod.methodName });
    });
    return relatedTestMethods;
}