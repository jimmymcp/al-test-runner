import * as assert from 'assert';
import * as vscode from 'vscode';
import * as alTestRunner from '../../extension';
import {writeFileSync, readdirSync, existsSync, unlinkSync, mkdirSync} from 'fs';
import * as os from 'os';
import * as sinon from 'sinon';
import { getLatestInsidersMetadata } from 'vscode-test/out/util';

const tempDir: string = os.tmpdir() + '\\ALTR';
if (existsSync(tempDir)) {
	readdirSync(tempDir).forEach(e => {unlinkSync(tempDir + '\\' + e);});
}
else {
	mkdirSync(tempDir);
}

function createTextDocument(name: string, content: string): Thenable<vscode.TextDocument> {
	const path = tempDir + '\\' + name;

	if (existsSync(path)) {
		unlinkSync(path);
	}

	writeFileSync(path, content);
	return vscode.workspace.openTextDocument(path);
}

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('textContainsTestCodeunit returns true for a test codeunit', async () => {
		const text = `codeunit 50100 "Test Codeunit"
		{
			Subtype = Test;
		}`;
		const doc = await createTextDocument('01.al', text);
		assert.strictEqual(alTestRunner.documentIsTestCodeunit(doc), true);
	});

	test('textContainsTestCodeunit returns false for a non-test codeunit', async () => {
		const text = `codeunit 50100 "Test Codeunit"
		{
			procedure ThisIsAMethod()
			begin
				Message('blah');
			end;
		}`;

		const doc = await createTextDocument('02.al', text);
		assert.strictEqual(alTestRunner.documentIsTestCodeunit(doc), false);
	});

	test('getTestMethodRanges returns procedures decorated with [Test]', async () => {
		const text = `codeuint 50100 "Test Codeunit"
		{
			Subtype = Test;
	
			[Test]
			procedure ThisIsASimpleTest()
			begin
			end;
	
			[Test]
			[HandlerFunctions('MessageHandler')]
			procedure ThisIsATestWithAHandlerLine()
			begin
			end;
	
			local procedure ThisIsNotATest(Test: Text)
			begin
			end;
		}`;
		const doc = await createTextDocument('03.al', text);
		const testMethodRanges = alTestRunner.getTestMethodRangesFromDocument(doc);
		assert.strictEqual(testMethodRanges.length, 2);
	});
	
	test('getTestMethodRanges doesn\'t return [Test]s that have been commented out', async () => {
		const text = `codeuint 50100 "Test Codeunit"
		{
			Subtype = Test;
	
			[Test]
			procedure ThisIsASimpleTest()
			begin
			end;
	
			[Test]
			[HandlerFunctions('MessageHandler')]
			procedure ThisIsATestWithAHandlerLine()
			begin
			end;
	
			/*
			[Test]
			procedure ThisTestHasBeenBlockedCommentedOut()
			begin
			end;
			*/
	
			//[Test]
			//procedure ThisTestHasBeenLineCommentedOut()
			//begin
			//end;
	
			local procedure ThisIsNotATest(Test: Text)
			begin
			end;
		}`;
	
		const doc = await createTextDocument('04.al', text);
		const testMethodRanges = alTestRunner.getTestMethodRangesFromDocument(doc);
		assert.strictEqual(testMethodRanges.length, 2);
	});

	test('launchConfigIsValid is true when test runner config holds a valid launch conifg', () => {
		const result = alTestRunner.launchConfigIsValid({launchConfigName: "someLaunchConfig", companyName: "", containerResultPath: "", securePassword: "", testSuiteName: "", userName: ""},
			{configurations: [{type: "al", request: "launch", name: "someLaunchConfig"}]});
		assert.strictEqual(result, true);
	});

	test('launchConfigIsValid is false when the test runner has a blank launch config', () => {
		const result = alTestRunner.launchConfigIsValid({launchConfigName: "", companyName: "", containerResultPath: "", securePassword: "", testSuiteName: "", userName: ""},
			{configurations: [{type: "al", request: "launch", name: "launchConfig"}]});
			assert.strictEqual(result, false);
	});

	test('launchConfigIsValid is false when the test runner has a launch config not in launch.json', () => {
		const result = alTestRunner.launchConfigIsValid({launchConfigName: "does not exist", companyName: "", containerResultPath: "", securePassword: "", testSuiteName: "", userName: ""},
			{configurations: [{type: "al", request: "launch", name: "launchConfig"}]});
			assert.strictEqual(result, false);
	});

	test('documentIsTestCodeunit returns true for a test codeunit', async () => {
		const text = `codeunit 50100 "Test Codeunit"
		{
			Subtype = Test;

			[Test]
			procedure ThisIsATestMethod()
			begin
			end;
		}`;

		const doc = await createTextDocument('05.al', text);
		const result = alTestRunner.documentIsTestCodeunit(doc);
		assert.strictEqual(result, true);
	});

	test('documentIsTestCodeunit returns false for a non-test codeunit', async () => {
		const text = `codeunit 50100 "Test Codeunit"
		{
			procedure ThisIsNotATestMethod()
			begin
			end;
		}`;

		const doc = await createTextDocument('06.al', text);
		const result = alTestRunner.documentIsTestCodeunit(doc);
		assert.strictEqual(result, false);
	});

	test('documentIsTestCodeunit returns false for a non-AL file', async () => {
		const text = `<root<node>Blah</node></root>`;

		const doc = await createTextDocument('07.xml', text);
		const result = alTestRunner.documentIsTestCodeunit(doc);
		assert.strictEqual(result, false);
	});

	test('getDocumentIdAndName returns a string with the id and name of the file', async () => {
		const text = `codeunit 51234 "Some Amazing Tests"
		{			
		}`;

		const doc = await createTextDocument('08.al', text);
		const result = alTestRunner.getDocumentIdAndName(doc);
		assert.strictEqual(result, '51234 Some Amazing Tests');
	});
});
