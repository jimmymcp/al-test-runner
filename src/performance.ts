import * as vscode from 'vscode';
import { getALTestRunnerPath } from './config';
import { existsSync } from 'fs';
import { join } from 'path';

let performanceStatusBarItem: vscode.StatusBarItem;

const performanceProfileWatcher = vscode.workspace.createFileSystemWatcher('**/.altestrunner/PerformanceProfile.alcpuprofile');
performanceProfileWatcher.onDidChange(e => updatePerformanceStatusBarItemVisibility());
performanceProfileWatcher.onDidCreate(e => updatePerformanceStatusBarItemVisibility());
performanceProfileWatcher.onDidDelete(e => updatePerformanceStatusBarItemVisibility())

export function createPerformanceStatusBarItem(): vscode.StatusBarItem {
    performanceStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right);
    performanceStatusBarItem.command = 'altestrunner.showPerformanceProfile';
    performanceStatusBarItem.text = 'Performance ⏱️';
    performanceStatusBarItem.tooltip = 'Show the performance profile that was downloaded from the previous test run.'
    updatePerformanceStatusBarItemVisibility();
    return performanceStatusBarItem;
}

export function updatePerformanceStatusBarItemVisibility() {
    if (existsSync(getPerformanceProfilePath())) {
        performanceStatusBarItem.show();
    }
    else {
        performanceStatusBarItem.hide();
    }
}

export function showPerformanceProfile() {
    vscode.commands.executeCommand('vscode.openWith', vscode.Uri.file(getPerformanceProfilePath()), 'alProfileVisualizer.topDown');
}

function getPerformanceProfilePath(): string {
    return join(getALTestRunnerPath(), 'PerformanceProfile.alcpuprofile');
}