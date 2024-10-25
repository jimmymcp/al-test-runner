import * as pwsh from 'node-powershell';
import { getTestFolderPath } from './alFileHelper';

export async function invokePowerShellCommand(command: string, cwd: string = getTestFolderPath() ?? ''): Promise<pwsh.InvocationResult> {
    return new Promise(async resolve => {

        const ps = new pwsh.PowerShell({
            pwsh: true,
            spawnOptions: {
                cwd: cwd
            }
        });
        
        const result = await ps.invoke(command);
        resolve(result);
    });
}