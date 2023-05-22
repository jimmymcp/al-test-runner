import * as vscode from 'vscode';
import { existsSync } from "fs";
import { join } from "path";
import { getParentFolderPathForFolder } from './file';
import { getTestFolderPath } from './alFileHelper';
import { discoverTests } from './testController';

export function getGitFolderPathForFolder(path: string): string | undefined {
    return getGitFolderPathForFolder2(path, 0);
}

export function createHEADFileWatcherForTestWorkspaceFolder() {
    const testFolderPath = getTestFolderPath();
    if (testFolderPath) {
        const gitFolder = getGitFolderPathForFolder(testFolderPath);
        if (gitFolder) {
            vscode.workspace.createFileSystemWatcher(join(gitFolder, 'HEAD')).onDidChange(e => {
                discoverTests();
            });
        }
    }
}

function getGitFolderPathForFolder2(path: string, depth: number): string | undefined {
    while (!folderHasGitRepo(path)) {
        const currPath = path;
        path = getParentFolderPathForFolder(currPath);
        if (depth == 2) {
            return undefined;
        }
        if (currPath === path) {
            return undefined;
        }

        return getGitFolderPathForFolder2(path, depth + 1);
    }

    return join(path, '.git');
}

function folderHasGitRepo(path: string): boolean {
    return existsSync(join(path, '.git'))
}