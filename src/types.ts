import * as vscode from 'vscode';

export type ALTestRunnerConfig = {
	launchConfigName: string;
	containerResultPath: string;
	userName: string;
	securePassword: string;
	companyName: string;
	testSuiteName: string;
	vmUserName: string;
	vmSecurePassword: string;
	remoteContainerName: string;
	dockerHost: string;
	newPSSessionOptions: string;
	testRunnerServiceUrl: string;
	codeCoveragePath: string;
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

export type ALObject = {
	type: string;
	id: number;
	name?: string;
};

export type CodeCoverageLine = {
	"ObjectType": string;
	"ObjectID": string;
	"LineType": string;
	"LineNo": string;
	"NoOfHits": string;
}

export type ALFile = {
	object: ALObject;
	path: string;
}