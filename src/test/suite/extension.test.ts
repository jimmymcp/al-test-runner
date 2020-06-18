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

	test('getTestMethodRanges removes trailing characters from method name', async () => {
		const text = `codeunit 50100 "Test Codeunit"
		{
			[Test]
			procedure ThisIsATestMethodWithATrailingSemicolon();
			begin
			end;
		}`;

		const doc = await createTextDocument('04a.al', text);
		const testMethodRanges = alTestRunner.getTestMethodRangesFromDocument(doc);
		assert.strictEqual(testMethodRanges.shift()!.name, 'ThisIsATestMethodWithATrailingSemicolon');
	});

	test('getTestMethodRanges removes trailing spaces from method name', async () => {
		const text = `codeunit 50100 "Test Codeunit"
		{
			[Test]
			procedure ThisIsATestMethodWithTrailingSpaces()  
			begin
			end;
		}`;

		const doc = await createTextDocument('04b.al', text);
		const testMethodRanges = alTestRunner.getTestMethodRangesFromDocument(doc);
		assert.strictEqual(testMethodRanges.shift()!.name, 'ThisIsATestMethodWithTrailingSpaces');
	});

	test('getTestMethodRanges includes test attributes in different cases', async () => {
		const text = `codeunit 50100 "Test Codeunit"
		{
			[Test]
			procedure TestOne()
			begin
			end;
			
			[test]
			procedure TestTwo()
			begin
			end;
			
			[TEST]
			procedure TestThree()
			begin
			end;
			
			[tESt]
			procedure TestFour()
			begin
			end;
		}`;

		const doc = await createTextDocument('04c.al', text);
		const testMethodRanges = alTestRunner.getTestMethodRangesFromDocument(doc);
		assert.strictEqual(testMethodRanges.length, 4);
	});

	test('launchConfigIsValid is true when test runner config holds a valid launch conifg', () => {
		const result = alTestRunner.launchConfigIsValid({launchConfigName: "someLaunchConfig", companyName: "", containerResultPath: "", securePassword: "", testSuiteName: "", userName: "",vmUserName: "", vmSecurePassword: "", remoteContainerName: "", dockerHost: "", newPSSessionOptions: ""},
			{configurations: [{type: "al", request: "launch", name: "someLaunchConfig"}]});
		assert.strictEqual(result, true);
	});

	test('launchConfigIsValid is false when the test runner has a blank launch config', () => {
		const result = alTestRunner.launchConfigIsValid({launchConfigName: "", companyName: "", containerResultPath: "", securePassword: "", testSuiteName: "", userName: "",vmUserName: "", vmSecurePassword: "",  remoteContainerName: "", dockerHost: "", newPSSessionOptions: ""},
			{configurations: [{type: "al", request: "launch", name: "launchConfig"}]});
			assert.strictEqual(result, false);
	});

	test('launchConfigIsValid is false when the test runner has a launch config not in launch.json', () => {
		const result = alTestRunner.launchConfigIsValid({launchConfigName: "does not exist", companyName: "", containerResultPath: "", securePassword: "", testSuiteName: "", userName: "",vmUserName: "", vmSecurePassword: "",  remoteContainerName: "", dockerHost: "", newPSSessionOptions: ""},
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

	test('getRangeOfFailingLineFromCallstack returns a range', async () => {
		const callstack = '"Some Tests CHWWTMN"(CodeUnit 9059385).ThisIsAFailingTest line 5 - Clever Handheld for Warehousing by Clever Dynamics "Test Runner - Mgt"(CodeUnit 130454).RunTests - Test Runner by Microsoft "Test Runner - Isol. Codeunit"(CodeUnit 130450).OnRun - Test Runner by Microsoft "Test Suite Mgt."(CodeUnit 130456).RunTests - Test Runner by Microsoft "Test Suite Mgt."(CodeUnit 130456).RunSelectedTests - Test Runner by Microsoft "Command Line Test Tool"(Page 130455).OnAction - Test Runner by Microsoft';
		const text = `codeunit 51234 "Some More Tests
		{
			[Test]
			procedure ThisIsAPassingTest()
			begin
				//blah blah
				Message('blah');
			end;

			[Test]
			procedure ThisIsAnotherPassingTest()
			begin
				//blah blah
				Message('blah');
			end;

			[Test]
			procedure ThisIsAFailingTest()
			begin
				//GIVEN an error is thrown
				Error('some error');
			end;
		}`;
		const doc = await createTextDocument('09.al', text);

		const result = alTestRunner.getRangeOfFailingLineFromCallstack(callstack, 'ThisIsAFailingTest', doc) as vscode.Range;
		assert.strictEqual(result.start.line, 22);
		assert.strictEqual(result.end.line, 22);
	});

	test('getRangeOfFailingLineFromCallstack return undefined for a method that does not exist', async () => {
		const callstack = '"Some Tests CHWWTMN"(CodeUnit 9059385).ThisIsAFailingTest line 3 - Clever Handheld for Warehousing by Clever Dynamics "Test Runner - Mgt"(CodeUnit 130454).RunTests - Test Runner by Microsoft "Test Runner - Isol. Codeunit"(CodeUnit 130450).OnRun - Test Runner by Microsoft "Test Suite Mgt."(CodeUnit 130456).RunTests - Test Runner by Microsoft "Test Suite Mgt."(CodeUnit 130456).RunSelectedTests - Test Runner by Microsoft "Command Line Test Tool"(Page 130455).OnAction - Test Runner by Microsoft';
		const text = `codeunit 51234 "Even More Tests"
		{
			[Test]
			procedure ThisIsATest()
			begin
			end;
		}`;

		const doc = await createTextDocument('09a.al', text);

		const result = alTestRunner.getRangeOfFailingLineFromCallstack(callstack, 'NonexistentMethod', doc);
		assert.strictEqual(undefined, result);
	});

	test('getLineNumberOfMethodDeclaration returns -1 for a method that cannot be found in the document', async () => {
		const text = `codeunit 51234 "Some Tests"
		{
			[Test]
			procedure ThisIsATest()
			begin
			end;
		}`;

		const doc = await createTextDocument('10.al', text);
		assert.strictEqual(alTestRunner.getLineNumberOfMethodDeclaration('DoesNotExist', doc), -1);
	});

	test('getLineNumberOfMethodDeclaration returns the line number of a method in the document', async () => {
		const text = `codeunit 51234 "Some Tests"
		{
			[Test]
			procedure ThisIsATest()
			begin
			end;
		}`;

		const doc = await createTextDocument('10a.al', text);
		assert.strictEqual(alTestRunner.getLineNumberOfMethodDeclaration('ThisIsATest', doc), 3);
	});

	test('getCodeunitIdFromAssemblyName returns the numeric part of the assembly name', () => {
		assert.strictEqual(50116, alTestRunner.getCodeunitIdFromAssemblyName('50116 Config Tests CACTMN'));
	});

	test('getTestMethodRangesFromDocument returns separate ranges for similar method names', async () => {
		const text = `codeunit 51234 "Some Tests"
		{
			[Test]
			procedure ThisIsATest()
			begin
			end;

			[Test]
			procedure ThisIsATestToo()
			begin
			end;
		}`;

		const doc = await createTextDocument('11.al', text);
		const testMethodRanges = alTestRunner.getTestMethodRangesFromDocument(doc);

		assert.strictEqual(testMethodRanges.length, 2);
	});
});
