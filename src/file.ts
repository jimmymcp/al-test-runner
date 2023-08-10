import * as vscode from 'vscode';
import { existsSync } from "fs";
import { basename } from 'path';

export function awaitFileExistence(path: string, timeout: number): Promise<Boolean> {
    return new Promise(resolve => {
        let timer = setTimeout(() => {
            if (timeout > 0) {
                watcher.dispose();
                resolve(false);
            }
        }, timeout);

        if (existsSync(path)) {
            clearTimeout(timer);
            resolve(true);
        }

        const watcher = vscode.workspace.createFileSystemWatcher(path);
        watcher.onDidCreate(e => {
            callResolve();
        });
        watcher.onDidChange(e => {
            callResolve();
        })

        function callResolve() {
            watcher.dispose();
            clearTimeout(timer);
            resolve(true);
        }
    });
}

export function getParentFolderPathForFolder(path: string): string {
    path = removeTrailingSlahesFromPath(path);
    return removeTrailingSlahesFromPath(path.substring(0, path.length - basename(path).length));
}

function removeTrailingSlahesFromPath(path: string): string {
    return path.replace(/\/*$/, '').replace(/\\*$/, ''); //remove trailing forward and back slashes from the path
}