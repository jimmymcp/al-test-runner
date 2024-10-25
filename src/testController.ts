import * as vscode from 'vscode';
import { documentIsTestCodeunit, getALFilesInWorkspace, getALObjectFromPath, getALObjectOfDocument, getFilePathOfObject, getTestMethodRangesFromDocument } from './alFileHelper';
import { getALTestRunnerConfig, getCurrentWorkspaceConfig, getLaunchConfiguration, launchConfigIsValid, selectLaunchConfig, setALTestRunnerConfig } from './config';
import { alTestController, attachDebugger, getAppJsonKey, invokeDebugTest, invokeTestRunner, outputWriter } from './extension';
import { ALTestAssembly, ALTestResult, ALMethod, DisabledTest, ALFile, launchConfigValidity, CodeCoverageDisplay } from './types';
import * as path from 'path';
import { sendDebugEvent, sendTestDebugStartEvent, sendTestRunFinishedEvent, sendTestRunStartEvent } from './telemetry';
import { buildTestCoverageFromTestItem } from './testCoverage';
import { getALFilesInCoverage, getFileCoverage, getStatementCoverage, readCodeCoverage, saveAllTestsCodeCoverage, saveTestRunCoverage } from './coverage';
import { readyToDebug } from './debug';
import { discoverPageScripts, runPageScript, testItemIsPageScript } from './pageScripting';

export let numberOfTests: number;

export function createTestController(controllerId: string = 'alTestController'): vscode.TestController {
    const alTestController = vscode.tests.createTestController(controllerId, 'AL Tests');
    const profile = alTestController.createRunProfile('Run', vscode.TestRunProfileKind.Run, request => {
        runTestHandler(request);
    });

    profile.loadDetailedCoverage = async (testRun: vscode.TestRun, fileCoverage: vscode.FileCoverage, token: vscode.CancellationToken) => {
        return new Promise(async (resolve) => {
            let alFile: ALFile = {
                path: fileCoverage.uri.fsPath,
                object: getALObjectFromPath(fileCoverage.uri.fsPath),
                excludeFromCodeCoverage: false
            }

            resolve(getStatementCoverage(await readCodeCoverage(CodeCoverageDisplay.All, testRun), alFile));
        });
    };

    alTestController.createRunProfile('Debug', vscode.TestRunProfileKind.Debug, request => {
        debugTestHandler(request);
    });

    alTestController.refreshHandler = async () => { discoverTests() };

    return alTestController;
}

export async function discoverTests() {
    numberOfTests = 0;
    const alFiles = await getALFilesInWorkspace();
    alFiles.forEach(async alFile => {
        const document = await vscode.workspace.openTextDocument(alFile.path);
        discoverTestsInDocument(document);
    });

    const pageScripts = await discoverPageScripts(alTestController);
    const pageScriptsItem = alTestController.createTestItem('Page Scripts', 'Page Scripts');

    pageScripts.forEach(pageScript => {
        pageScriptsItem.children.add(pageScript);
    });

    alTestController.items.add(pageScriptsItem)
}

export async function discoverTestsInFileName(fileName: string) {
    const document = await vscode.workspace.openTextDocument(fileName);
    discoverTestsInDocument(document);
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
                numberOfTests -= 1;
            });

            getTestMethodRangesFromDocument(document).forEach(testRange => {
                const testItem = alTestController.createTestItem(testRange.name, testRange.name, document.uri);
                testItem.range = testRange.range;
                codeunitItem!.children.add(testItem);
                numberOfTests += 1;
            });
            alTestController.items.add(codeunitItem);
        }
    }
}

export async function runTestHandler(request: vscode.TestRunRequest) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const run = alTestController.createTestRun(request, timestamp);
    sendTestRunStartEvent(request);

    let results: ALTestAssembly[];
    if (request.include === undefined) {
        results = await runAllTests();
        saveAllTestsCodeCoverage();
    }
    else if (request.include.length > 1) {
        results = await runSelectedTests(request);
    }
    else {
        const testItem = request.include![0];

        if (testItemIsPageScript(testItem)) {
            results = await runPageScript(testItem);
        }
        else {
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
            buildTestCoverageFromTestItem(testItem);
        }
    }

    setResultsForTestItems(results, request, run);

    if (getCurrentWorkspaceConfig().enableCodeCoverage) {
        await saveTestRunCoverage(run);
        const codeCoverage = await readCodeCoverage(CodeCoverageDisplay.All, run);
        getALFilesInCoverage(codeCoverage).forEach(alFile => {
            run.addCoverage(getFileCoverage(codeCoverage, alFile));
        });
    }

    run.end();
    sendTestRunFinishedEvent(request);
    if (results.length > 0) {
        outputTestResults(results);
    }
}

function setResultsForTestItems(results: ALTestAssembly[], request: vscode.TestRunRequest, run: vscode.TestRun) {
    if (results.length == 0) {
        return;
    }

    let testItems: vscode.TestItem[] = [];
    if (request.include) {
        request.include.forEach(testItem => {
            testItems.push(testItem);
        })
    }
    else {
        alTestController.items.forEach(testCodeunit => {
            testItems.push(testCodeunit);
        });
    }

    testItems!.forEach(testItem => {
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
    });
}

export function readyToRunTests(): Promise<Boolean> {
    return new Promise(async (resolve) => {
        sendDebugEvent('readyToRunTests-start');

        if (launchConfigIsValid() == launchConfigValidity.Invalid) {
            sendDebugEvent('readyToRunTests-launchConfigNotValid');
            //clear the credentials and company name if the launch config is not valid
            setALTestRunnerConfig('userName', '');
            setALTestRunnerConfig('securePassword', '');
            setALTestRunnerConfig('companyName', '');
            setALTestRunnerConfig('testRunnerServiceUrl', '')
            await selectLaunchConfig();
        }

        if (launchConfigIsValid() == launchConfigValidity.Valid) {
            sendDebugEvent('readyToRunTests-launchConfigIsValid');
            resolve(true);
        }
        else {
            resolve(false);
        }
    });
}

export async function runTest(filename?: string, selectionStart?: number, extensionId?: string, extensionName?: string): Promise<ALTestAssembly[]> {
    sendDebugEvent('runTest-start', { filename: filename ? filename : 'undefined', selectionStart: selectionStart ? selectionStart.toString() : '0', extensionId: extensionId ? extensionId : 'undefined', extensionName: extensionName ? extensionName : 'undefined' });
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

                sendDebugEvent('runTest-ready', { filename: filename, selectionStart: selectionStart.toString(), extensionId: extensionId!, extensionName: extensionName! });

                const results: ALTestAssembly[] = await invokeTestRunner(`Invoke-ALTestRunner -Tests Test -ExtensionId "${extensionId}" -ExtensionName "${extensionName}" -FileName "${filename}" -SelectionStart ${selectionStart} -LaunchConfig '${getLaunchConfiguration(getALTestRunnerConfig().launchConfigName)}'`);
                resolve(results);
            }
            else {
                resolve([]);
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

                sendDebugEvent('runAllTests-ready');

                const results: ALTestAssembly[] = await invokeTestRunner(`Invoke-ALTestRunner -Tests All -ExtensionId "${extensionId}" -ExtensionName "${extensionName}" -LaunchConfig '${getLaunchConfiguration(getALTestRunnerConfig().launchConfigName)}'`);
                resolve(results);
            }
            else {
                resolve([]);
            }
        });
    });
}

export async function runSelectedTests(request: vscode.TestRunRequest, extensionId?: string, extensionName?: string): Promise<ALTestAssembly[]> {
    return new Promise(async (resolve) => {
        await readyToRunTests().then(async ready => {
            if (ready) {
                if (extensionId === undefined) {
                    extensionId = getAppJsonKey('id');
                }

                if (extensionName === undefined) {
                    extensionName = getAppJsonKey('name');
                }

                sendDebugEvent('runSelectedTests-ready');

                const disabledTests = getDisabledTestsForRequest(request);
                const disabledTestsJson = JSON.stringify(disabledTests);

                const results: ALTestAssembly[] = await invokeTestRunner(`Invoke-ALTestRunner -Tests All -ExtensionId "${extensionId}" -ExtensionName "${extensionName}" -DisabledTests ('${disabledTestsJson}' | ConvertFrom-Json) -LaunchConfig '${getLaunchConfiguration(getALTestRunnerConfig().launchConfigName)}'`)
                resolve(results);
            }
            else {
                resolve([]);
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
        sendTestDebugStartEvent(request);
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

    const ready = await readyToDebug();
    if (!ready) {
        vscode.window.showErrorMessage('AL Test Runner is not ready to debug. Please check that the Test Runner Service app is installed and the testRunnerServiceUrl in config.json is correct.');
    }

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

export function getDisabledTestsForRequest(request: vscode.TestRunRequest, testContoller?: vscode.TestController): DisabledTest[] {
    let disabledTests: DisabledTest[] = [];
    let testCodeunitsToRun: vscode.TestItem[] = getTestCodeunitsIncludedInRequest(request);
    let controller;
    if (testContoller) {
        controller = testContoller;
    }
    else {
        controller = alTestController;
    }

    if (!controller) {
        return disabledTests;
    }

    if (!controller.items) {
        return disabledTests;
    }

    //tests which are in codeunits where some tests are included, but the tests themselves are not included
    testCodeunitsToRun.forEach(testCodeunit => {
        //unless the codeunit itself is included, then iterate over its children to test which ones need to be disabled
        if (request.include?.indexOf(testCodeunit) == -1) {
            testCodeunit.children.forEach(testItem => {
                if (request.include?.indexOf(testItem) == -1) {
                    disabledTests.push({ codeunitName: testCodeunit.label, method: testItem.label });
                }
            });
        }
    });

    //test codeunits where none of their tests are included
    controller.items.forEach(testCodeunit => {
        if (testCodeunitsToRun.indexOf(testCodeunit) == -1) {
            disabledTests.push({ codeunitName: testCodeunit.label, method: '*' })
        }
    });

    return disabledTests;
}

export function getTestCodeunitsIncludedInRequest(request: vscode.TestRunRequest): vscode.TestItem[] {
    let testCodeunits: vscode.TestItem[] = [];

    if (request.include) {
        request.include.forEach(testItem => {
            if (testItem.children.size > 0) {
                testCodeunits.push(testItem);
            }

            if (testItem.parent) {
                if (testCodeunits.indexOf(testItem.parent) == -1) {
                    testCodeunits.push(testItem.parent);
                }
            }
        });
    }

    return testCodeunits;
}

export function getTestItemsIncludedInRequest(request: vscode.TestRunRequest): vscode.TestItem[] {
    let testItems: vscode.TestItem[] = [];

    if (request.include) {
        //iterate through the test items with children (i.e. the test codeunits) first
        //add all the children of each included codeunit
        request.include.filter(testItem => {
            return !testItem.parent;
        }).forEach(testCodeunit => {
            if (testCodeunit.children) {
                testCodeunit.children.forEach(testItem => {
                    testItems.push(testItem);
                });
            }
        });

        //then add any included children as long as they are not already in the collection
        request.include.filter(testItem => {
            return testItem.parent;
        }).forEach(testItem => {
            if (testItems.indexOf(testItem) == -1) {
                testItems.push(testItem);
            }
        });
    }

    return testItems;
}

export function getTestItemForMethod(method: ALMethod): vscode.TestItem | undefined {
    let testCodeunit = alTestController.items.get(method.objectName);
    if (testCodeunit) {
        return testCodeunit.children.get(method.methodName);
    }
}

async function outputTestResults(assemblies: ALTestAssembly[]): Promise<Boolean> {
    return new Promise(async (resolve) => {
        let noOfTests: number = 0;
        let noOfFailures: number = 0;
        let noOfSkips: number = 0;
        let totalTime: number = 0;

        if (assemblies.length > 0) {
            outputWriter.clear();
        }

        for (let assembly of assemblies) {
            noOfTests += parseInt(assembly.$.total);
            const assemblyTime = parseFloat(assembly.$.time);
            totalTime += assemblyTime;
            const failed = parseInt(assembly.$.failed);
            noOfFailures += failed;
            const skipped = parseInt(assembly.$.skipped);
            noOfSkips += skipped;

            if (failed > 0) {
                outputWriter.write('❌ ' + assembly.$.name + '\t' + assemblyTime.toFixed(2) + 's');
            }
            else {
                outputWriter.write('✅ ' + assembly.$.name + '\t' + assemblyTime.toFixed(2) + 's');
            }
            for (let test of assembly.collection[0].test) {
                const testTime = parseFloat(test.$.time);
                let filePath = '';
                const codeunitName = assembly.$.name.substring(assembly.$.name.indexOf(' ') + 1);
                switch (test.$.result) {
                    case 'Pass':
                        outputWriter.write('\t✅ ' + test.$.method + '\t' + testTime.toFixed(2) + 's');
                        break;
                    case 'Skip':
                        filePath = assembly.$.name == 'Page Scripts' ? '' : await getFilePathOfObject({ type: 'codeunit', id: 0, name: codeunitName }, test.$.method);
                        outputWriter.write('\t❓ ' + test.$.method + '\t' + testTime.toFixed(2) + 's ' + filePath);
                        break;
                    case 'Fail':
                        filePath = assembly.$.name == 'Page Scripts' ? '' : await getFilePathOfObject({ type: 'codeunit', id: 0, name: codeunitName }, test.$.method);
                        outputWriter.write('\t❌ ' + test.$.method + '\t' + testTime.toFixed(2) + "s " + filePath);
                        outputWriter.write('\t\t' + test.failure[0].message);
                        break;
                    default:
                        break;
                }
            }
        }

        let statusBarItem = vscode.window.createStatusBarItem('altestrunner.summary', vscode.StatusBarAlignment.Right);
        let summaryText, backgroundColor: string;

        if ((noOfFailures + noOfSkips) === 0) {
            summaryText = `✅ ${noOfTests} test(s) ran in ${totalTime.toFixed(2)}s at ${assemblies[0].$!["run-time"]}`;
            backgroundColor = 'statusBarItem.prominentBackground';
        }
        else {
            summaryText = `❌ ${noOfTests} test(s) ran in ${totalTime.toFixed(2)}s - ${noOfFailures + noOfSkips} test(s) failed/skipped at ${assemblies[0].$!["run-time"]}`;
            backgroundColor = 'statusBarItem.errorBackground';
        }

        outputWriter.write(summaryText);
        statusBarItem.text = summaryText;
        statusBarItem.backgroundColor = new vscode.ThemeColor(backgroundColor);
        statusBarItem.command = 'workbench.view.testing.focus';
        statusBarItem.show();

        setTimeout(() => {
            statusBarItem.dispose();
        }, 10000);

        outputWriter.show();
        resolve(true);
    });
}