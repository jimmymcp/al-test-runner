import * as vscode from 'vscode';
import * as path from 'path';
import { readFileSync } from 'fs';
import { exec } from 'child_process';
import { getALTestRunnerConfig, getALTestRunnerLaunchConfig, getALTestRunnerPath } from './config';
import { stdout } from 'process';
import { getTestFolderPath } from './alFileHelper';

export async function discoverPageScripts(testController: vscode.TestController): Promise<vscode.TestItem[]> {
    return new Promise(async (resolve, reject) => {
        let testItems: vscode.TestItem[] = [];
        const scriptFiles = await vscode.workspace.findFiles('**/*.yml');
        scriptFiles.forEach(scriptFile => {
            if (uriIsPageScript(scriptFile)) {
                const name = path.parse(scriptFile.fsPath).name;
                testItems.push(testController.createTestItem(name, name, scriptFile));
            }
        });

        resolve(testItems);
    })
}

export async function runPageScript(testItem: vscode.TestItem) {
    const launchConfig = await getALTestRunnerLaunchConfig();
    const env = {
        ...process.env,
        pageScriptingUser: getALTestRunnerConfig().userName,
        pageScriptingPassword: 'Pass@word1'
    }

    const options = {
        env,
        cwd: getTestFolderPath()
    }

    let server = `${launchConfig.server}/${launchConfig.serverInstance}`;
    if (launchConfig.tenant) {
        server += `?tenant=${launchConfig.tenant}`;
    }
    let command: string = `npx replay -Tests '${testItem.uri?.fsPath}' -Authentication UserPassword -StartAddress '${launchConfig.server}' -UserNameKey pageScriptingUser -PasswordKey pageScriptingPassword -ResultDir '${getALTestRunnerPath()}'`;

    //replace double slashes with single slashes
    command = command.replace(/\\/g, '/');
    
    exec(command, options, (error, stdout, stderr) => {
        if (error) {
            vscode.window.showErrorMessage(`Error executing command: ${error.message}`);
            return;
        }

        if (stderr) {
            vscode.window.showErrorMessage(`Error output: ${stderr}`);
            return;
        }

        vscode.window.showInformationMessage(`Command output: ${stdout}`);
    });
}

export function testItemIsPageScript(testItem: vscode.TestItem): boolean {
    return testItem.parent?.label === 'Page Scripts';
}

function uriIsPageScript(uri: vscode.Uri): boolean {
    return readFileSync(uri.fsPath, { encoding: 'utf-8' }).includes('page:');
}