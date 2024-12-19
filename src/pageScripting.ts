import * as vscode from 'vscode';
import * as path from 'path';
import { existsSync, readFileSync } from 'fs';
import { exec } from 'child_process';
import { getALTestRunnerConfig, getALTestRunnerLaunchConfig, getALTestRunnerPath, getContainerPasswordFromALTestRunnerConfig, getCurrentWorkspaceConfig } from './config';
import { ALTestAssembly, ALTestCollection, ALTestResult } from './types';
import { join } from 'path';
import * as xml2js from 'xml2js';
import { getALTestRunnerTerminal } from './extension';

export async function viewPageScriptingReport() {
    let terminal = getALTestRunnerTerminal();
    terminal.show(true);
    terminal.sendText(`cd "${getALTestRunnerPath()}"`);
    terminal.sendText('npx playwright show-report');
}

export async function discoverPageScripts(testController: vscode.TestController): Promise<vscode.TestItem[]> {
    return new Promise(async (resolve) => {
        let testItems: vscode.TestItem[] = [];
        const scriptFiles = await vscode.workspace.findFiles('**/*.yml', '**/.altestrunner/**');
        scriptFiles.forEach(scriptFile => {
            if (uriIsPageScript(scriptFile)) {
                const name = path.parse(scriptFile.fsPath).name;
                testItems.push(testController.createTestItem(name, name, scriptFile));
            }
        });

        resolve(testItems);
    })
}

export async function runPageScript(testItem: vscode.TestItem): Promise<ALTestAssembly[]> {
    return new Promise(async (resolve, reject) => {
        if (!(existsSync(`${getALTestRunnerPath()}/node_modules/@microsoft/bc-replay`))) {
            vscode.window.showInformationMessage('Installing bc-replay package. This may take a few minutes.');
            await execCommand('npm install @microsoft/bc-replay', { cwd: getALTestRunnerPath() });
        }

        const launchConfig = await getALTestRunnerLaunchConfig();
        let containerPassword;
        try {
            containerPassword = await getContainerPasswordFromALTestRunnerConfig();
        } catch (error) {
            resolve([]);
            return;
        }

        const env = {
            ...process.env,
            pageScriptingUser: getALTestRunnerConfig().userName,
            pageScriptingPassword: containerPassword
        }

        const options = {
            env,
            cwd: getALTestRunnerPath()
        }

        let server: string = `${launchConfig.server}/${launchConfig.serverInstance}`;
        if (launchConfig.tenant) {
            server += `?tenant=${launchConfig.tenant}`;
        }

        let testsPath: string = '';
        if (testItem.parent) {
            testsPath = testItem.uri!.fsPath;
            vscode.window.showInformationMessage(`Running test: ${testItem.label} on ${server}`);
        }
        else {
            testItem.children.forEach(child => {
                testsPath = join(path.dirname(child.uri!.fsPath), '/**/*.yml');
            });

            vscode.window.showInformationMessage(`Running all page scripts on ${server}`);
        }

        let command: string = `npx replay -Tests "${testsPath}" -Authentication UserPassword -StartAddress "${server}" -UserNameKey pageScriptingUser -PasswordKey pageScriptingPassword -ResultDir "${getALTestRunnerPath()}"`;

        if (getCurrentWorkspaceConfig().runPageScriptsHeaded) {
            command += ' -Headed';
        }

        //replace double slashes with single slashes
        command = command.replace(/\\/g, '/');

        try {
            await execCommand(command, options);
        } catch (error: any) {
            if (!(error.message.includes('One or more test recordings failed'))) {
                vscode.window.showErrorMessage(`Error executing command: ${error.message}`);
                reject(error);
                return;
            }
        }

        resolve(await getResults());
    });
}

function execCommand(command: string, options: any): Promise<void> {
    return new Promise((resolve, reject) => {
        exec(command, options, (error, stdout, stderr) => {
            if (error) {
                reject(error);
                return;
            }

            resolve();
        });
    });
}

export function testItemIsPageScript(testItem: vscode.TestItem): boolean {
    return (testItem.parent?.label === 'Page Scripts') || (testItem.label == 'Page Scripts');
}

function uriIsPageScript(uri: vscode.Uri): boolean {
    return readFileSync(uri.fsPath, { encoding: 'utf-8' }).includes('page:');
}

async function getResults(): Promise<ALTestAssembly[]> {
    return new Promise(async resolve => {
        const resultPath = `${getALTestRunnerPath()}\\results.xml`;
        if (!existsSync(resultPath)) {
            resolve([]);
            return;
        }

        const xmlParser = new xml2js.Parser();
        const resultXml = readFileSync(resultPath, { encoding: 'utf-8' });
        const resultObj = await xmlParser.parseStringPromise(resultXml);

        let results: ALTestAssembly[] = [];
        let collections: ALTestCollection[] = [];
        resultObj.testsuites.testsuite.forEach((suite: any) => {
            let collection: ALTestCollection;
            let tests: ALTestResult[] = [];
            suite.testcase.forEach((test: any) => {
                let testName: string = test.$.name;
                testName = testName.trim();
                if (testName.startsWith('(')) {
                    testName = testName.substring(1);
                }
                if (testName.endsWith(')')) {
                    testName = testName.substring(0, testName.length - 1);
                }
                testName = path.parse(testName).name;

                tests.push({
                    $: {
                        name: testName,
                        method: testName,
                        result: test.failure ? 'Fail' : 'Pass',
                        time: test.$.time
                    },
                    failure: [{
                        "stack-trace": test.failure ? test.failure[0]._ : '',
                        message: test.failure ? test.failure[0]._ : ''
                    }]
                });
            });

            collection = {
                $: {
                    name: suite.$.name,
                    failed: suite.$.failures,
                    skipped: suite.$.skipped,
                    time: suite.$.time,
                    passed: (parseInt(suite.$.tests) - parseInt(suite.$.failures) - parseInt(suite.$.skipped)).toString(),
                    total: suite.$.tests
                },
                test: tests
            }
            collections.push(collection);
        });
        results.push({
            $: {
                "run-date": `${new Date().getFullYear()}-${new Date().getMonth() + 1}-${new Date().getDate()}`,
                "run-time": `${new Date().toTimeString()}`,
                "test-framework": "Page Scripting",
                name: 'Page Scripts',
                failed: resultObj.testsuites.$.failures,
                skipped: resultObj.testsuites.$.skipped,
                time: resultObj.testsuites.$.time,
                passed: (parseInt(resultObj.testsuites.$.tests) - parseInt(resultObj.testsuites.$.failures) - parseInt(resultObj.testsuites.$.skipped)).toString(),
                total: resultObj.testsuites.$.tests
            },
            collection: collections
        });

        resolve(results);
    });
}