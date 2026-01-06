import { PowerShell } from 'node-powershell';
import { getTestFolderPath } from './alFileHelper';
import { spawn } from 'child_process';
import * as vscode from 'vscode';
import { getExtension } from './extension';
import { join } from 'path';

let psInstance = new PowerShell({
    executableOptions: {
        '-ExecutionPolicy': 'Bypass',
        '-NoProfile': true
    },
    pwsh: true
});

export interface PowerShellResult {
    stdout: string;
    stderr: string;
    exitCode: number;
}

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

export async function invokePwshCommand(command: string, cwd: string = getTestFolderPath() ?? ''): Promise<PowerShellResult> {
    return new Promise(async resolve => {
        const modulePath = join(getExtension()!.extensionPath, 'PowerShell', 'ALTestRunner.psm1');
        command = `$ErrorActionPreference = 'Stop'; Set-Location '${cwd}'; Import-Module '${modulePath}' -Force -DisableNameChecking; ` + command;

        try {
            // Invoke and capture output
            const result = await psInstance.invoke(command);

            resolve({
                stdout: result.raw,
                stderr: result.stderr?.toString() || '',
                exitCode: result.hadErrors ? 1 : 0
            });
        } catch (error: any) {
            resolve({
                stdout: '',
                stderr: error.message || String(error),
                exitCode: 1
            });
        }
    });
}