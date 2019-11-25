import * as assert from 'assert';
import * as vscode from 'vscode';
import * as alTestRunner from '../../extension';
import {writeFileSync, readdirSync, existsSync, unlinkSync, mkdirSync} from 'fs';
import * as os from 'os';

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
});
