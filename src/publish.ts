import { existsSync, readFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import * as vscode from 'vscode';
import { activeEditorIsOpenToTestAppJson, openEditorToTestFileIfNotAlready } from './alFileHelper';
import { getALTestRunnerPath, getCurrentWorkspaceConfig } from './config';
import { getALTestRunnerTerminal } from './extension';
import { awaitFileExistence } from './file';
import { runTestHandler } from './testController';
import { PublishType } from "./types";

let shouldPublishApp: Boolean = false;

export function publishApp(publishType: PublishType): Promise<Boolean> {
    return new Promise(async resolve => {
        let result: Boolean = false;
        if (publishType === PublishType.None) {
            resolve(true);
            return;
        }

        const closeEditor = await openEditorToTestFileIfNotAlready();
        let command: string = '';

        if (getCurrentWorkspaceConfig().enablePublishingFromPowerShell) {
            shouldPublishApp = true;
            if (existsSync(getPublishCompletionPath())) {
                unlinkSync(getPublishCompletionPath());
            }

            await vscode.commands.executeCommand('al.package');
            const resultExists = await awaitFileExistence(getPublishCompletionPath(), getCurrentWorkspaceConfig().publishTimeout);
            if (resultExists) {
                const content = readFileSync(getPublishCompletionPath(), { encoding: 'utf-8' })
                result = content.trim() === '1';
            }
            else {
                result = false;
            }
        }
        else {
            switch (publishType) {
                case PublishType.Publish:
                    command = 'al.publishNoDebug';
                    break;
                case PublishType.Rapid:
                    command = 'al.incrementalPublishNoDebug';
                    break;
            }

            await vscode.commands.executeCommand(command);
            result = true;
        }

        if (closeEditor) {
            if (activeEditorIsOpenToTestAppJson()) {
                await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
            }
        }

        resolve(result);
    });
}

export async function publishAppFile(uri: vscode.Uri): Promise<Boolean> {
    return new Promise(async resolve => {
        shouldPublishApp = false;
        const terminal = getALTestRunnerTerminal(getTerminalName());
        terminal.show(true);
        terminal.sendText(' ');
        terminal.sendText(`Publish-App -AppFile "${uri.fsPath}" -CompletionPath "${getPublishCompletionPath()}"`);
        
        const resultExists = await awaitFileExistence(getPublishCompletionPath(), getCurrentWorkspaceConfig().publishTimeout);
            if (resultExists) {
                const content = readFileSync(getPublishCompletionPath(), { encoding: 'utf-8' })
                const result = content.trim() === '1';
                resolve(result);
            }
            else {
                resolve(false);
            }
    });
}

export async function onChangeAppFile(uri: vscode.Uri) {
    if ((!shouldPublishApp) && (!getCurrentWorkspaceConfig().automaticPublishing)) {
        return;
    }

    if ((uri.fsPath.indexOf('dep.app') > 0) || (uri.fsPath.indexOf('.alpackages') > 0)) {
        return;
    }

    if (await publishAppFile(uri)) {
        runTestHandler(new vscode.TestRunRequest());
    }
}

function getTerminalName(): string {
    return 'al-test-runner';
}

function getPublishCompletionPath(): string {
    return join(getALTestRunnerPath(), "publish.txt");
}

export function displayPublishTerminal() {
    const terminal = getALTestRunnerTerminal(getTerminalName());
    terminal.show(false);
}