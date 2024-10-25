import { getTestFolderPath } from './alFileHelper';
import { spawn } from 'child_process';
import * as vscode from 'vscode';

export async function invokePowerShellCommand(command: string, cwd: string = getTestFolderPath() ?? ''): Promise<string> {
    return new Promise(async resolve => {
        //why this hideous looking code? I've had trouble with the node-powershell module, deep in the dependency tree something doesn't compile and causes the extenion to fail to load
        const ps = spawn('pwsh', ['-Command', command]);

        ps.stdout.on('data', (data) => {
            resolve(data.toString().trim('\n'));
            return;
        });

        ps.stderr.on('data', (data) => {
            vscode.window.showErrorMessage(`Error calling PowerShell: ${data.toString()}`);
            return;
        });
    });
}