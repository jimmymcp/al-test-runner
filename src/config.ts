import * as vscode from 'vscode';
import { getWorkspaceFolder } from "./extension";

export function getTestWorkspaceFolder(): string {
    let config = vscode.workspace.getConfiguration('al-test-runner');
    if (config.testFolderName) {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders) {
            let testFolder = workspaceFolders.filter(element => {
                return element.name == config.testFolderName;
            });
            if (testFolder.length == 1) {
                return testFolder.shift()!.uri.fsPath;
            }
        }
    }

    return getWorkspaceFolder();
}