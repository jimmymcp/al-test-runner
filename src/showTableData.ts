import * as vscode from 'vscode';
import { getALTestRunnerConfig, getLaunchConfiguration, getTestWorkspaceFolder } from './config';
import { activeEditor, getALTestRunnerTerminal } from './extension';
import { sendShowTableDataEvent } from './telemetry';

export async function showTableData() {
    sendShowTableDataEvent();
    let wordAtCursor = getWordAtCursor();
    let recordName = findRecordNameForVariable(wordAtCursor);
    if (recordName !== '') {
        vscode.window.showInformationMessage(`Opening browser to table ${recordName}...`);
        let showTableDataTerminal = getALTestRunnerTerminal('al-test-runner-2');
        showTableDataTerminal.sendText(`cd "${getTestWorkspaceFolder()}"`);
        showTableDataTerminal.sendText(`Show-TableData '${recordName}' -LaunchConfig '${getLaunchConfiguration(getALTestRunnerConfig().launchConfigName)}'`);
    }
    else {
        vscode.window.showErrorMessage(`Could not find a record variable matching the name ${wordAtCursor}`);
    }
}

function getWordAtCursor(): string {
    let rangeOfWord = activeEditor!.document.getWordRangeAtPosition(activeEditor!.selection.active);
    return activeEditor!.document.getText(rangeOfWord);
}

function findRecordNameForVariable(variableName: string): string {
    let documentText = activeEditor!.document.getText();
    let regex = String.raw`${variableName} *: *Record *"*[^;\)"]+`;
    let matches = documentText.match(regex);
    if (matches) {
        let recordDefinition = matches!.shift()!;
        if (recordDefinition.indexOf('"') > 0) {
            return recordDefinition.substring(recordDefinition.lastIndexOf('"') + 1);
        }
        else {
            return recordDefinition.substring(recordDefinition.lastIndexOf(' ') + 1);
        }
    }

    return '';
}