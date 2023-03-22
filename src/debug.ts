import { existsSync, unlinkSync } from "fs";
import { join } from "path";
import { getALTestRunnerConfig, getALTestRunnerPath, getLaunchConfiguration } from "./config";
import { getALTestRunnerTerminal, getTerminalName } from "./extension";
import { awaitFileExistence } from "./file";

export async function readyToDebug(): Promise<Boolean> {
    return new Promise(async resolve => {
        const terminal = getALTestRunnerTerminal(getTerminalName());
        const path = getDebugReadyPath();
        if (existsSync(path)) {
            unlinkSync(path);
        }
        terminal.sendText(`Get-ReadyToDebug -Path '${path}' -LaunchConfig '${getLaunchConfiguration(getALTestRunnerConfig().launchConfigName)}'`);
        terminal.show();
        const ready = await awaitFileExistence(path, 30000);
        resolve(ready);
    });
}

function getDebugReadyPath(): string {
    return join(getALTestRunnerPath(), "debug.txt");
}