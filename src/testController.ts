import * as vscode from 'vscode';
import { documentIsTestCodeunit, getALFilesInWorkspace, getALObjectOfDocument } from './alFileHelper';
import { getCurrentWorkspaceConfig, launchConfigIsValid, selectLaunchConfig, setALTestRunnerConfig } from './config';
import { alTestController, attachDebugger, getAppJsonKey, getTestMethodRangesFromDocument, initDebugTest, invokeDebugTest, invokeTestRunner, outputTestResults } from './extension';
import { ALTestAssembly, ALTestResult } from './types';
import * as path from 'path';

export function createTestController(): vscode.TestController {
    const alTestController = vscode.tests.createTestController('alTestController', 'AL Tests');
    alTestController.createRunProfile('Run', vscode.TestRunProfileKind.Run, request => {
        runTestHandler(request);
    });
    alTestController.createRunProfile('Debug', vscode.TestRunProfileKind.Debug, request => {
        debugTestHandler(request);
    });
    return alTestController;
}

export async function discoverTests() {
    const alFiles = await getALFilesInWorkspace();
    alFiles.forEach(async alFile => {
        const document = await vscode.workspace.openTextDocument(alFile.path);
        discoverTestsInDocument(document);
    });
}

export async function discoverTestsInDocument(document: vscode.TextDocument) {
    if (documentIsTestCodeunit(document)) {
        const alFiles = await getALFilesInWorkspace('', `**/${path.basename(document.uri.fsPath)}`);
        let alFile;
        if (alFiles) {
            alFile = alFiles.shift();
            let codeunitItem = await getTestItemFromFileNameAndSelection(document.uri.fsPath, 0);
            if (codeunitItem === undefined) {
                codeunitItem = alTestController.createTestItem(alFile!.object!.name!, alFile!.object!.name!, document.uri);
            }

            codeunitItem.children.forEach(test => {
                codeunitItem!.children.delete(test.id);
            });

            getTestMethodRangesFromDocument(document).forEach(testRange => {
                const testItem = alTestController.createTestItem(testRange.name, testRange.name, document.uri);
                testItem.range = testRange.range;
                codeunitItem!.children.add(testItem);
            });
            alTestController.items.add(codeunitItem);
        }
    }
}

export async function runTestHandler(request: vscode.TestRunRequest) {
    const run = alTestController.createTestRun(request);
    let results: ALTestAssembly[];
    if (request.include === undefined) {
        results = await runAllTests();
        alTestController.items.forEach(codeunit => {
            codeunit.children.forEach(test => {
                const result = getResultForTestItem(results, test, codeunit);
                setResultForTestItem(result, test, run);
            });
        });
    }
    else {
        const testItem = request.include![0];
        let lineNumber: number = 0;
        let filename: string;
        if (testItem.parent) {
            lineNumber = testItem.range!.start.line;
            filename = testItem.parent!.uri!.fsPath;
        }
        else {
            filename = testItem.uri!.fsPath;
        }

        results = await runTest(filename, lineNumber);

        if (testItem.parent) {
            const result = getResultForTestItem(results, testItem, testItem.parent)
            setResultForTestItem(result, testItem, run);
        }
        else {
            testItem.children.forEach(test => {
                const result = getResultForTestItem(results, test, testItem);
                setResultForTestItem(result, test, run);
            });
        }
    }

    run.end();
    outputTestResults(results);
}

export function readyToRunTests(): Promise<Boolean> {
    return new Promise((resolve, reject) => {
        if (!(launchConfigIsValid())) {
            //clear the credentials and company name if the launch config is not valid
            setALTestRunnerConfig('userName', '');
            setALTestRunnerConfig('securePassword', '');
            setALTestRunnerConfig('companyName', '');
            selectLaunchConfig();
        }

        if (launchConfigIsValid()) {
            resolve(true);
        }
        else {
            reject();
        }
    });
}

export async function runTest(filename?: string, selectionStart?: number, extensionId?: string, extensionName?: string): Promise<ALTestAssembly[]> {
    return new Promise(async (resolve) => {
        await readyToRunTests().then(async ready => {
            if (ready) {
                if (filename === undefined) {
                    filename = vscode.window.activeTextEditor!.document.fileName;
                }
                if (selectionStart === undefined) {
                    selectionStart = vscode.window.activeTextEditor!.selection.start.line;
                }
                if (extensionId === undefined) {
                    extensionId = getAppJsonKey('id');
                }
                if (extensionName === undefined) {
                    extensionName = getAppJsonKey('name');
                }

                const results: ALTestAssembly[] = await invokeTestRunner('Invoke-ALTestRunner -Tests Test -ExtensionId ' + extensionId + ' -ExtensionName "' + extensionName + '" -FileName "' + filename + '" -SelectionStart ' + selectionStart);
                resolve(results);
            }
        })
    });
};

export async function runAllTests(extensionId?: string, extensionName?: string): Promise<ALTestAssembly[]> {
    return new Promise(async (resolve) => {
        await readyToRunTests().then(async ready => {
            if (ready) {
                if (extensionId === undefined) {
                    extensionId = getAppJsonKey('id');
                }

                if (extensionName === undefined) {
                    extensionName = getAppJsonKey('name');
                }

                const results: ALTestAssembly[] = await invokeTestRunner('Invoke-ALTestRunner -Tests All -ExtensionId ' + extensionId + ' -ExtensionName "' + extensionName + '"');
                resolve(results);
            }
        });
    });
}

export async function debugTestHandler(request: vscode.TestRunRequest) {
    if (request.include) {
        const testItem = request.include[0];
        let filename: string;
        let lineNumber: number;

        if (testItem.parent) {
            filename = testItem.parent.uri!.fsPath;
            lineNumber = testItem.range!.start.line;
        }
        else {
            filename = testItem.uri!.fsPath;
            lineNumber = 0;
        }

        debugTest(filename, lineNumber);
    }
    else {
        debugTest('', 0);
    }
}

export async function debugTest(filename: string, selectionStart: number) {
    if (filename === undefined) {
        filename = vscode.window.activeTextEditor!.document.fileName;
    }
    if (selectionStart === undefined) {
        selectionStart = vscode.window.activeTextEditor!.selection.start.line;
    }

    initDebugTest(filename);

    const config = getCurrentWorkspaceConfig();
    await new Promise(r => setTimeout(r, config.testRunnerInitialisationTime));

    await attachDebugger();
    invokeDebugTest(filename, selectionStart);
}

function setResultForTestItem(result: ALTestResult, testItem: vscode.TestItem, run: vscode.TestRun) {
    if (result.$.result == 'Pass') {
        run.passed(testItem);
    }
    else {
        run.failed(testItem, new vscode.TestMessage(`${result.failure[0].message[0]}\n\n${result.failure[0]["stack-trace"][0]}`));
    }
}

function getResultForTestItem(results: ALTestAssembly[], testItem: vscode.TestItem, parent: vscode.TestItem): ALTestResult {
    const assemblyName = parent.label.substring(1, parent.label.length - 1);
    let returnResult: ALTestResult = { $: { method: testItem.label, name: testItem.label, result: 'none', time: '0' }, failure: [{ message: '', 'stack-trace': '' }] };;
    results.forEach(assembly => {
        if (assembly.$.name.includes(assemblyName)) {
            assembly.collection.forEach(collection => {
                collection.test.forEach(result => {
                    if (result.$.method === testItem.label) {
                        returnResult = result;
                    }
                });
            });
        }
    });

    return returnResult;
}

export async function getTestItemFromFileNameAndSelection(filename?: string, selectionStart?: number): Promise<vscode.TestItem | undefined> {
    return new Promise(async resolve => {
        if (filename === undefined) {
            filename = vscode.window.activeTextEditor!.document.fileName;
        }

        if (selectionStart === undefined) {
            selectionStart = vscode.window.activeTextEditor!.selection.start.line;
        }

        const document = await vscode.workspace.openTextDocument(filename);
        const object = getALObjectOfDocument(document);

        if (object) {
            const codeunitItem = alTestController.items.get(object!.name!);

            if (selectionStart === 0) {
                resolve(codeunitItem);
                return;
            }

            let testMethodRanges = getTestMethodRangesFromDocument(document);
            testMethodRanges = testMethodRanges.filter(range => {
                if (range.range.start.line <= selectionStart!) {
                    return true;
                }
            });

            if (testMethodRanges.length > 0) {
                const testMethod = testMethodRanges.pop();
                const testItem = codeunitItem!.children.get(testMethod!.name);
                resolve(testItem);
            }
        }
        else {
            resolve(undefined);
        }
    });
}

export async function deleteTestItemForFilename(filename: string) {
    const testItem = await getTestItemFromFileNameAndSelection(filename, 0);
    if (testItem) {
        alTestController.items.delete(testItem.id);
    }
}