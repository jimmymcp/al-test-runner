import * as vscode from 'vscode';
import TelemetryReporter, { TelemetryEventMeasurements, TelemetryEventProperties } from "@vscode/extension-telemetry";
import { appInsightsKey, failedToPublishMessage } from "./constants";
import { getExtension, telemetryReporter } from "./extension";
import { getTestItemsIncludedInRequest, numberOfTests } from './testController';
import { getCurrentWorkspaceConfig } from './config';
import { RunType } from './types'

export function createTelemetryReporter(): TelemetryReporter {
    const extensionId = getExtension()!.id;
    const extensionVersion = getExtension()!.packageJSON.version;
    return new TelemetryReporter(extensionId, extensionVersion, appInsightsKey);
}

export function sendTestRunStartEvent(request: vscode.TestRunRequest) {
    sendTestRunEvent('001-TestStarted', request);
}

export function sendTestRunFinishedEvent(request: vscode.TestRunRequest) {
    sendTestRunEvent('002-TestFinished', request);
}

export function sendTestDebugStartEvent(request: vscode.TestRunRequest) {
    sendTestRunEvent('003-DebugStarted', request);
}

export function sendShowTableDataEvent() {
    sendEvent('004-ShowTableData');
}

export function sendShowRelatedTestsEvent() {
    sendEvent('005-ShowRelatedTests');
}

export function sendNoTestFolderNameError(): string {
    return sendError('E01-NoTestFolderNameSet', 'Please set the name of the workspace folder which contains your test app in the extension settings (see "Test Folder Name").');
}

export function sendFailedToPublishError(detail?: string): string {
    let message: string = '';
    if (detail) {
        message = detail;
    }
    else {
        message = failedToPublishMessage;
    }
    return sendError('E02-PowerShellPublishingFailed', message);
}

export function sendDebugEvent(name: string) {
    if (getCurrentWorkspaceConfig().sendDebugTelemetry) {
        telemetryReporter.sendTelemetryEvent(name, { 'isDebugEvent': 'true' });
    }
}

function sendError(eventName: string, errorMessage: string): string {
    telemetryReporter.sendTelemetryErrorEvent(eventName);
    vscode.window.showErrorMessage(errorMessage);
    return errorMessage;
}

function sendTestRunEvent(eventName: string, request: vscode.TestRunRequest) {
    let runType: RunType;
    let testCount: number;
    let codeCoverageEnabled, publishBeforeTest, enablePublishingFromPowerShell: string;
    const config = getCurrentWorkspaceConfig();

    if (config.enableCodeCoverage) {
        codeCoverageEnabled = 'true';
    }
    else {
        codeCoverageEnabled = 'false';
    }

    publishBeforeTest = config.publishBeforeTest;

    if (config.enablePublishingFromPowerShell) {
        enablePublishingFromPowerShell = 'true';
    }
    else {
        enablePublishingFromPowerShell = 'false';
    }

    if (request.include === undefined) {
        runType = RunType.All;
        testCount = numberOfTests;
    }
    else if (request.include.length > 1) {
        runType = RunType.Selection;
        testCount = getTestItemsIncludedInRequest(request).length;
    }
    else {
        const testItem = request.include[0]!;
        if (testItem.parent) {
            runType = RunType.Test;
            testCount = 1;
        }
        else {
            runType = RunType.Codeunit;
            testCount = testItem.children.size;
        }
    }

    sendEvent(eventName, { 'codeCoverageEnabled': codeCoverageEnabled, 'publishBeforeTest': publishBeforeTest, 'enablePublishingFromPowerShell': enablePublishingFromPowerShell }, { 'runType': runType, 'testCount': testCount });
}

export function sendEvent(eventName: string, properties?: TelemetryEventProperties, measurements?: TelemetryEventMeasurements) {
    telemetryReporter.sendTelemetryEvent(eventName, properties, measurements);
}