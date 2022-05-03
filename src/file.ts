import * as vscode from 'vscode';
import { existsSync } from "fs";

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