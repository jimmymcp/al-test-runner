import { join } from 'path';
import * as vscode from 'vscode';
import { activeEditorIsOpenToTestAppJson, getTestFolderPath, openEditorToTestFileIfNotAlready } from './alFileHelper';
import { getALTestRunnerConfig, getALTestRunnerPath, getCurrentWorkspaceConfig, getLaunchConfiguration } from './config';
import { failedToPublishMessage } from './constants';
import { getALTestRunnerTerminal } from './extension';
import { sendALCommandPublishError, sendDebugEvent, sendFailedToPublishError } from './telemetry';
import { PublishResult, PublishType } from "./types";
import { invokePwshCommand } from './powershell';
import * as glob from 'glob';
import * as fs from 'fs';

export function publishApp(publishType: PublishType): Promise<PublishResult> {
    return new Promise(async resolve => {
        sendDebugEvent('publishApp-start', { publishType: publishType.toString() });
        let success: boolean = false;
        let message: string = '';
        if (publishType === PublishType.None) {
            resolve({ success: true, message: '' });
            return;
        }

        const closeEditor = await openEditorToTestFileIfNotAlready();
        let command: string = '';

        if (getCurrentWorkspaceConfig().enablePublishingFromPowerShell) {
            sendDebugEvent('publishApp-publishFromPowerShell');

            const result = await vscode.commands.executeCommand('al.package') as { success: boolean; error?: string } | undefined;
            if (result && result.success === false) {
                success = false;
                message = result.error || failedToPublishMessage;
                sendALCommandPublishError(message);
            }
            else {
                //find the most recently created .app file in the test folder
                const testFolderPath = getTestFolderPath();
                if (!testFolderPath) {
                    success = false;
                    message = 'Could not find test folder path';
                    sendFailedToPublishError(message);
                } else {
                    const appFiles = glob
                        .sync(join(testFolderPath, '*.app'))
                        .filter((file: string) => !file.endsWith('.dep.app'));

                    if (appFiles.length === 0) {
                        success = false;
                        message = 'No .app files found in test folder';
                        sendFailedToPublishError(message);
                    } else {
                        const sortedAppFiles = appFiles
                            .map((file: string) => ({ file, mtime: fs.statSync(file).mtime }))
                            .sort((a: any, b: any) => b.mtime - a.mtime);

                        const mostRecentAppFile = sortedAppFiles[0].file;

                        await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: 'Publishing App with PowerShell...' }, async (progress) => {
                            const publishResult = await publishAppFile(vscode.Uri.file(mostRecentAppFile));
                            success = publishResult.success;
                            message = publishResult.message;
                        });
                    }
                }
            }
        }
        else {
            sendDebugEvent('publishApp-publishWithALCommand');
            switch (publishType) {
                case PublishType.Publish:
                    command = 'al.publishNoDebug';
                    break;
                case PublishType.Rapid:
                    command = 'al.incrementalPublishNoDebug';
                    break;
            }

            const result = await vscode.commands.executeCommand(command) as { success: boolean; error?: string } | undefined;
            if (result && result.success === false) {
                success = false;
                message = result.error || failedToPublishMessage;
                sendALCommandPublishError(message);
            } else {
                success = true;
            }
        }

        if (closeEditor) {
            if (activeEditorIsOpenToTestAppJson()) {
                await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
            }
        }

        resolve({ success: success, message: message });
    });
}

export async function publishAppFile(uri: vscode.Uri): Promise<PublishResult> {
    return new Promise(async resolve => {
        const publishCommand = `Publish-App -AppFile "${uri.fsPath}" -LaunchConfig '${getLaunchConfiguration(getALTestRunnerConfig().launchConfigName)}'`;
        const result = await invokePwshCommand(publishCommand);
        if (result.exitCode !== 0) {
            sendALCommandPublishError(result.stderr);
            resolve({ success: false, message: result.stderr });
            return;
        }
        resolve({ success: true, message: '' });
    });
}

function getTerminalName(): string {
    return 'al-test-runner';
}

export function displayPublishTerminal() {
    const terminal = getALTestRunnerTerminal(getTerminalName());
    terminal.show(false);
}