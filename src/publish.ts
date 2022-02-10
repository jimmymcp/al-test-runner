import { existsSync, readFileSync, readSync, unlinkSync } from 'fs';
import { join } from 'path';
import * as vscode from 'vscode';
import { activeEditorIsOpenToTestAppJson, openEditorToTestFileIfNotAlready } from './alFileHelper';
import { getALTestRunnerPath } from './config';
import { getALTestRunnerTerminal } from './extension';
import { PublishType } from "./types";

let shouldPublishApp: Boolean = false;

export function publishApp(publishType: PublishType): Promise<Boolean> {
    return new Promise(async resolve => {
        let result: Boolean = false;
        if (publishType === PublishType.None) {
            result = true;
        }

        const closeEditor = await openEditorToTestFileIfNotAlready();
        let command: string = '';

        if (true) { //put behind extension setting?
            shouldPublishApp = true;
            if (existsSync(getPublishCompletionPath())) {
                unlinkSync(getPublishCompletionPath());
            }

            await vscode.commands.executeCommand('al.package');
            const resultExists = await awaitFileExistence(getPublishCompletionPath());
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

export async function publishAppFile(uri: vscode.Uri) {
    shouldPublishApp = false;
    const terminal = getALTestRunnerTerminal(getTerminalName());
    terminal.show(true);
    terminal.sendText(' ');
    terminal.sendText('# Publishing app');
    terminal.sendText(`Publish-App -AppFile "${uri.fsPath}" -CompletionPath "${getPublishCompletionPath()}"`);
}

export function onChangeAppFile(uri: vscode.Uri) {
    if (!shouldPublishApp) {
        return;
    }

    if (uri.fsPath.indexOf('dep.app') > 0) {
        return;
    }

    publishAppFile(uri);
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

function awaitFileExistence(path: string, timeout: number = 10000): Promise<Boolean> {
    return new Promise(resolve => {
        const timer = setTimeout(() => {
            watcher.dispose();
            resolve(false);
        }, timeout);
    
        if (existsSync(path)) {
            clearTimeout(timer);
            resolve(true);
        }
    
        const watcher = vscode.workspace.createFileSystemWatcher(path);
        watcher.onDidCreate(e => {
            watcher.dispose();
            clearTimeout(timer);
            resolve(true);
        });
    });
}