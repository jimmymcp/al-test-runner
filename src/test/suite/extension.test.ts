import * as assert from 'assert';
import * as vscode from 'vscode';
import * as alTestRunner from '../../extension';
import { writeFileSync, readdirSync, existsSync, unlinkSync, mkdirSync } from 'fs';
import * as os from 'os';
import { documentIsTestCodeunit, getALObjectOfDocument, getDocumentIdAndName } from '../../alFileHelper';
import { createTestController, getDisabledTestsForRequest, getTestCodeunitsIncludedInRequest, getTestItemsIncludedInRequest } from '../../testController';

const tempDir: string = os.tmpdir() + '\\ALTR';

if (existsSync(tempDir)) {
	readdirSync(tempDir).forEach(e => { unlinkSync(tempDir + '\\' + e); });
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
	const testController = getTestController();

	test('textContainsTestCodeunit returns true for a test codeunit', async () => {
		const text = `codeunit 50100 "Test Codeunit"
		{
			Subtype = Test;
		}`;
		const doc = await createTextDocument('01.al', text);
		assert.strictEqual(documentIsTestCodeunit(doc), true);
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
		assert.strictEqual(documentIsTestCodeunit(doc), false);
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
		const result = documentIsTestCodeunit(doc);
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
		const result = documentIsTestCodeunit(doc);
		assert.strictEqual(result, false);
	});

	test('documentIsTestCodeunit returns false for a non-AL file', async () => {
		const text = `<root<node>Blah</node></root>`;

		const doc = await createTextDocument('07.xml', text);
		const result = documentIsTestCodeunit(doc);
		assert.strictEqual(result, false);
	});

	test('getDocumentIdAndName returns a string with the id and name of the file', async () => {
		const text = `codeunit 51234 "Some Amazing Tests"
		{			
		}`;

		const doc = await createTextDocument('08.al', text);
		const result = getDocumentIdAndName(doc);
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

	test('getALObjectOfDocument returns alObject type for codeunit with object declaration on first line', async () => {
		const text = `codeunit 51234 "Some Tests"
		{
			//some file content
		}`

		const doc = await createTextDocument('12.al', text);
		const alObject = getALObjectOfDocument(doc);

		assert.notStrictEqual(alObject, undefined, 'alObject should not be undefined');
		assert.strictEqual(alObject!.id, 51234);
		assert.strictEqual(alObject!.name!, 'Some Tests');
	});

	test('getALObjectOfDocument returns alObject type for codeunit with object declaration not on first line', async () => {
		const text = `//some comments at the start of the file
		//maybe some nonsense about copyright ©

		codeunit 51234 "Some Tests"
		{
			//some file content
		}`

		const doc = await createTextDocument('13.al', text);
		const alObject = getALObjectOfDocument(doc);

		assert.notStrictEqual(alObject, undefined, 'alObject should not be undefined');
		assert.strictEqual(alObject!.id, 51234);
		assert.strictEqual(alObject!.name!, 'Some Tests');
	});

	test('getALObjectOfDocument returns alObject type for codeunit with strange casing of object declaration', async () => {
		const text = `cOdeUnIt 51234 "Some Tests
		{
			//some file content
		}`

		const doc = await createTextDocument('14.al', text);
		const alObject = getALObjectOfDocument(doc);

		assert.notStrictEqual(alObject, undefined, 'alObject should not be undefined');
		assert.strictEqual(alObject!.id, 51234);
		assert.strictEqual(alObject!.name!, 'Some Tests');
	});

	test('getTestCodeunitsIncludedInRequest returns empty array when no test items included in request', () => {
		assert.notStrictEqual([], getTestCodeunitsIncludedInRequest(new vscode.TestRunRequest()));
	});

	test('getTestCodeunitsIncludedInRequest returns test items with children included in request', () => {
		const request = new vscode.TestRunRequest(getIncludedTests(testController, ['P1', 'P2', 'P4']))
		const result = getTestCodeunitsIncludedInRequest(request);
		assert.strictEqual(result.length, 2, 'Expected two parents included in the result');
		assert.strictEqual('P1', result[0].id);
		assert.strictEqual('P2', result[1].id);
	});

	test('getTestCodeunitsIncludedInRequest returns parents of test items which are included in request', () => {
		const request = new vscode.TestRunRequest(getIncludedTests(testController, ['P1.C1', 'P2.C4']))
		const result = getTestCodeunitsIncludedInRequest(request);
		assert.strictEqual(result.length, 2, 'Expected two parents included')
		assert.strictEqual('P1', result[0].id)
		assert.strictEqual('P2', result[1].id)
	});

	test('getDisabledTestsForRequest is empty when request does not include any tests', () => {
		const result = getDisabledTestsForRequest(new vscode.TestRunRequest());
		assert.notStrictEqual([], result);
	});

	test('getDisabledTestsForRequest includes non-included tests and codeunits where no tests included', () => {
		const request = new vscode.TestRunRequest(getIncludedTests(testController, ['P1.C2', 'P3.C6']))
		const result = getDisabledTestsForRequest(request, testController);
		assert.strictEqual(result.length, 5)
		assert.notStrictEqual(result[0], { codeunitName: 'Parent One', method: 'Child One' });
		assert.notStrictEqual(result[1], { codeunitName: 'Parent One', method: 'Child Three' });
		assert.notStrictEqual(result[2], { codeunitName: 'Parent Two', method: '*' });
		assert.notStrictEqual(result[3], { codeunitName: 'Parent Three', method: 'Child Five' });
		assert.notStrictEqual(result[4], { codeunitName: 'Parent Four', method: '*' })
	});

	test('getDisabledTestsForRequest does not include the children of test codeunits which are included in the request', () => {
		const request = new vscode.TestRunRequest(getIncludedTests(testController, ['P1.C2', 'P3']))
		const result = getDisabledTestsForRequest(request, testController);
		assert.strictEqual(result.length, 4)
		assert.notStrictEqual(result[0], { codeunitName: 'Parent One', method: 'Child One' });
		assert.notStrictEqual(result[1], { codeunitName: 'Parent One', method: 'Child Three' });
		assert.notStrictEqual(result[2], { codeunitName: 'Parent Two', method: '*' });
		assert.notStrictEqual(result[3], { codeunitName: 'Parent Four', method: '*' });
	});

	test('getTestItemsIncludedInRequest returns empty when request does not include anything', () => {
		const result = getTestItemsIncludedInRequest(new vscode.TestRunRequest());
		assert.notStrictEqual(result, [])
	});

	test('getTestItemsIncludedInRequest returns test items which are included in the request', () => {
		const request = new vscode.TestRunRequest(getIncludedTests(testController, ['P1.C1', 'P1.C2']));
		const result = getTestItemsIncludedInRequest(request);
		assert.strictEqual(result.length, 2)
		assert.strictEqual(result[0].id, 'C1');
		assert.strictEqual(result[1].id, 'C2');
	});

	test('getTestItemsIncludedInRequest returns children of parent items which are included in the request', () => {
		const request = new vscode.TestRunRequest(getIncludedTests(testController, ['P3']));
		const result = getTestItemsIncludedInRequest(request);
		assert.strictEqual(result.length, 2);
		assert.strictEqual(result[0].id, 'C5');
		assert.strictEqual(result[1].id, 'C6');
	})

	test('getTestItemsIncludedInRequest does not duplicate child items of included parents when children also included', () => {
		const request = new vscode.TestRunRequest(getIncludedTests(testController, ['P1.C3', 'P1']));
		//GIVEN that child three is already included by parent one, do not include it twice
		const result = getTestItemsIncludedInRequest(request);
		assert.strictEqual(result.length, 3);
		assert.strictEqual(result[0].id, 'C1');
		assert.strictEqual(result[1].id, 'C2');
		assert.strictEqual(result[2].id, 'C3');
	});

	function getTestController(): vscode.TestController {
		const testController = createTestController();
		const parentOne = testController.createTestItem('P1', 'Parent One');
		const childOne = testController.createTestItem('C1', 'Child One');
		const childTwo = testController.createTestItem('C2', 'Child Two');
		const childThree = testController.createTestItem('C3', 'Child Three');
		const parentTwo = testController.createTestItem('P2', 'Parent Two');
		const childFour = testController.createTestItem('C4', 'Child Four');
		const parentThree = testController.createTestItem('P3', 'Parent Three');
		const childFive = testController.createTestItem('C5', 'Child Five');
		const childSix = testController.createTestItem('C6', 'Child Six');
		const parentFour = testController.createTestItem('P4', 'Parent Four');
		parentOne.children.add(childOne);
		parentOne.children.add(childTwo);
		parentOne.children.add(childThree);
		parentTwo.children.add(childFour);
		parentThree.children.add(childFive);
		parentThree.children.add(childSix);
		testController.items.add(parentOne);
		testController.items.add(parentTwo);
		testController.items.add(parentThree);
		testController.items.add(parentFour);
		return testController;
	}

	function getIncludedTests(testController: vscode.TestController, testIds: string[]): vscode.TestItem[] {
		let testItems: vscode.TestItem[] = [];
		let testItem: vscode.TestItem | undefined;

		testIds.forEach(testId => {
			testItem = undefined;
			testId.split('.').forEach(id => {
				if (!testItem) {
					testItem = testController.items.get(id);
				}
				else {
					testItem = testItem.children.get(id);
				}
			});

			if (testItem) {
				testItems.push(testItem);
			}
		});

		return testItems;
	}
});