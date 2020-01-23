import * as vscode from 'vscode';

export type ALTestRunnerConfig = {
	launchConfigName: string;
	containerResultPath: string;
	userName: string;
	securePassword: string;
	companyName: string;
	testSuiteName: string;
	remoteContainerName: string;
	remotePort: number;
	executionPreference: string;
};

export type ALTestAssembly = {
	$: {
		time: string;
		skipped: string;
		failed: string;
		passed: string;
		total: string;
		'run-time': string;
		'run-date': string;
		'test-framework': string;
		name: string;
	};
	collection: ALTestCollection[];	
};

export type ALTestCollection = {
	$: {
		time: string;
		skipped: string;
		failed: string;
		passed: string;
		total: string;
		name: string;
	};
	test: ALTestResult[];
};

export type ALTestResult = {
	$: {
		method: string;
		name: string;
		result: string;
		time: string;
	};
	failure: [{
		message: string;
		'stack-trace': string
	}]
};

export type ALTestMethodRange = {
	name: string;
	range: vscode.Range;
};