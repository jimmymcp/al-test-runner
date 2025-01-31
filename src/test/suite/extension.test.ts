import * as assert from 'assert';
import * as vscode from 'vscode';
import * as alTestRunner from '../../extension';
import { getTestMethodRangesFromDocument } from '../../alFileHelper';
import { writeFileSync, readdirSync, existsSync, unlinkSync, mkdirSync } from 'fs';
import * as os from 'os';
import { documentIsTestCodeunit, getALObjectOfDocument, getDocumentIdAndName, getMethodRangesFromDocument } from '../../alFileHelper';
import { createTestController, getDisabledTestsForRequest, getTestCodeunitsIncludedInRequest, getTestItemsIncludedInRequest } from '../../testController';
import { getMaxLengthOfPropertyFromArray } from '../../output';
import { join } from 'path';
import { getGitFolderPathForFolder } from '../../git';
import { getParentFolderPathForFolder } from '../../file';
import { getCommentLinesForTestItem, getDevOpsTestStepsForTestItems } from '../../devOpsTestSteps';
import { DevOpsTestStep } from '../../types';

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
        const testMethodRanges = getTestMethodRangesFromDocument(doc);
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
        const testMethodRanges = getTestMethodRangesFromDocument(doc);
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
        const testMethodRanges = getTestMethodRangesFromDocument(doc);
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
        const testMethodRanges = getTestMethodRangesFromDocument(doc);
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
        const testMethodRanges = getTestMethodRangesFromDocument(doc);
        assert.strictEqual(testMethodRanges.length, 4);
    });

    test('documentIsTestCodeunit returns true for a test codeunit', async () => {
        const text = `codeunit 50100 "Test Codeunit"
        {
            SubType =  test;

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
        const testMethodRanges = getTestMethodRangesFromDocument(doc);

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
    });

    test('getTestItemsIncludedInRequest does not duplicate child items of included parents when children also included', () => {
        const request = new vscode.TestRunRequest(getIncludedTests(testController, ['P1.C3', 'P1']));
        //GIVEN that child three is already included by parent one, do not include it twice
        const result = getTestItemsIncludedInRequest(request);
        assert.strictEqual(result.length, 3);
        assert.strictEqual(result[0].id, 'C1');
        assert.strictEqual(result[1].id, 'C2');
        assert.strictEqual(result[2].id, 'C3');
    });

    test('getMethodRangesFromDocument find method ranges in document', async () => {
        const text = `codeunit 51234 "Some Tests
        {
            //some file content
            internal procedure ThisIsAProcedure()
            begin
            end;

            local procedure ThisIsAnotherProcedure(Customer: Record Customer)
            begin
            end;

            procedure AndAnotherProcedure(var a: Integer; TempSalesLine: Record "Sales Line" temporary)
            begin
            end;
        }`

        const doc = await createTextDocument('15.al', text);
        const result = getMethodRangesFromDocument(doc);
        assert.strictEqual(result.length, 3);
        assert.strictEqual(result[0].name, 'ThisIsAProcedure');
        assert.strictEqual(result[1].name, 'ThisIsAnotherProcedure');
        assert.strictEqual(result[2].name, 'AndAnotherProcedure');
    });

    test('getMethodRangesFromDocument does not return methods which are commented out', async () => {
        const text = `codeunit 51234 "Some Tests"
        {
            //this method has been commented out
            //procedure CommentedOutMethod()
            //begin
            //end;
            
            /*this method has been commented out as well
            procedure AnotherCommentedOutMethod()
            begin
            end;
            */

            procedure ThisIsAnActiveMethod()
            begin
            end;
        }`;

        const doc = await createTextDocument('16.al', text);
        const result = getMethodRangesFromDocument(doc);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].name, 'ThisIsAnActiveMethod');
    });

    test('getMethodRangesFromDocument returns methods which are not commented out even when surrounded by comment blocks', async () => {
        const text = `codeunit 51234 "Some Tests"
        {
            /*this method has been commented out
            [Test]
            procedure FirstCommentedOutTest()
            begin
            end;
            */

            [Test]
            procedure NotCommentedTest()
            begin
            end;

            /*this method has also been commented out
            [Test]
            procedure SecondCommentedOutTest()
            begin
            end;
            /*
        }`;

        const doc = await createTextDocument('17.al', text);
        const result = getTestMethodRangesFromDocument(doc);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].name, 'NotCommentedTest');
    });

    function getTestController(): vscode.TestController {
        const testController = createTestController('testALTestController');
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

    test('getMaxLengthOfPropertyFromArray returns the max length of values of a given string property from the array', () => {
        const array = [{ month: "January" }, { month: "February" }, { month: "March" }, { month: "April" }]
        assert.strictEqual(getMaxLengthOfPropertyFromArray(array, 'month'), 8);
    });

    test('getMaxLengthOfPropertyFromArray returns the max length of values of a given non-string property from the array', () => {
        const array = [{ month: "January", d: 31 }, { month: "February", d: 28 }, { month: "March", d: 31 }, { month: "April", d: 30 }]
        assert.strictEqual(getMaxLengthOfPropertyFromArray(array, 'd'), 2);
    });

    test('getMaxLengthOfPropertyFromArray returns the length of the property name when longer than any of its values', () => {
        const array = [{ month: "January", days: 31 }, { month: "February", days: 28 }, { month: "March", days: 31 }, { month: "April", days: 30 }]
        assert.strictEqual(getMaxLengthOfPropertyFromArray(array, 'days'), 4);
    });

    test('getMaxLengthOfPropertyFromArray called without property returns max length of elements in array', () => {
        const array = ["one", "two", "three", "four"];
        assert.strictEqual(getMaxLengthOfPropertyFromArray(array), 5);
    });

    test('getParentFolderPathForFolder returns path of parent folder', () => {
        assert.strictEqual('C:\\Users\\myuser\\Documents', getParentFolderPathForFolder('C:\\Users\\myuser\\Documents\\childfolder'));
    });

    test('getParentFolderPathForFolder returns path of parent folder which has trailing slash', () => {
        assert.strictEqual('C:\\Users\\myuser\\Documents', getParentFolderPathForFolder('C:\\Users\\myuser\\Documents\\childfolder\\'));
    });

    test('getGitFolderPathForFolder returns undefined when no .git folder in current folder or 2 parents', () => {
        const path = join(os.tmpdir(), 'testGitFolder01');
        if (!existsSync(path)) {
            mkdirSync(path);
        }

        assert.strictEqual(getGitFolderPathForFolder(path), undefined);
    });

    test('getGitFolderPathForFolder returns path when there is a .git folder in current folder', () => {
        const path = join(os.tmpdir(), 'testGitFolder02');
        if (!existsSync(path)) {
            mkdirSync(path);
        }

        const gitPath = join(path, '.git');
        if (!existsSync(gitPath)) {
            mkdirSync(gitPath);
        }

        assert.strictEqual(getGitFolderPathForFolder(path), join(path, '.git'));
    });

    test('getGitFolderPathForFolder returns parent path when there is a .git folder in parent folder', () => {
        const path = join(os.tmpdir(), 'testGitFolder03');
        if (!existsSync(path)) {
            mkdirSync(path);
        }

        const gitPath = join(path, '.git');
        if (!existsSync(gitPath)) {
            mkdirSync(gitPath);
        }

        const childPath = join(path, 'childFolder');
        if (!existsSync(childPath)) {
            mkdirSync(childPath);
        }

        assert.strictEqual(getGitFolderPathForFolder(childPath), join(path, '.git'));
    });

    test('getCommentLinesForTestItem returns given, when, then lines included in the test item', async () => {
        const text = `codeunit 50100 "Test Codeunit"
    [Test]
    procedure ThisIsATestMethod()
    begin
        //[GIVEN] the given part
        //[WHEN] the when part
        //[THEN] the then part
    end;`;
        const doc = await createTextDocument('18.al', text);
        let testItem: vscode.TestItem = testController.createTestItem('ThisIsATestMethod', 'ThisIsATestMethod', doc.uri);
        testItem.range = new vscode.Range(2, 13, 2, 31);
        const commentLines: string[] = await getCommentLinesForTestItem(testItem);

        assert.strictEqual(commentLines.length, 3);
        assert.strictEqual(commentLines[0], '//[GIVEN] the given part');
        assert.strictEqual(commentLines[1], '//[WHEN] the when part');
        assert.strictEqual(commentLines[2], '//[THEN] the then part');
    });

    test('getCommentLinesForTestItem returns all comment lines included in the test item', async () => {
        const text = `codeunit 50100 "Test Codeunit"
    [Test]
    procedure ThisIsATestMethod()
    begin
        //[GIVEN] the given part
        //[GIVEN] a second given part
        //[WHEN] the when part
        //[THEN] the then part
        //[THEN] a second then part
    end;`;
        const doc = await createTextDocument('19.al', text);
        let testItem: vscode.TestItem = testController.createTestItem('ThisIsATestMethod', 'ThisIsATestMethod', doc.uri);
        testItem.range = new vscode.Range(2, 13, 2, 31);
        const commentLines: string[] = await getCommentLinesForTestItem(testItem);

        assert.strictEqual(commentLines.length, 5);
        assert.strictEqual(commentLines[0], '//[GIVEN] the given part');
        assert.strictEqual(commentLines[1], '//[GIVEN] a second given part');
        assert.strictEqual(commentLines[2], '//[WHEN] the when part');
        assert.strictEqual(commentLines[3], '//[THEN] the then part');
        assert.strictEqual(commentLines[4], '//[THEN] a second then part');
    });

    test('getCommentLinesForTestItem returns all comment lines included in the test item and not subsequent methods', async () => {
        const text = `codeunit 50100 "Test Codeunit"
    [Test]
    procedure ThisIsATestMethod()
    begin
        //[GIVEN] the given part
        //[GIVEN] a second given part
        //[WHEN] the when part
        //[THEN] the then part
        //[THEN] a second then part
    end;
    
    local procedure ThisIsAnotherMethod
    begin
        //this method also has a comment which should not be included
    end;`;
        const doc = await createTextDocument('20.al', text);
        let testItem: vscode.TestItem = testController.createTestItem('ThisIsATestMethod', 'ThisIsATestMethod', doc.uri);
        testItem.range = new vscode.Range(2, 13, 2, 31);
        const commentLines: string[] = await getCommentLinesForTestItem(testItem);

        assert.strictEqual(commentLines.length, 5);
        assert.strictEqual(commentLines[0], '//[GIVEN] the given part');
        assert.strictEqual(commentLines[1], '//[GIVEN] a second given part');
        assert.strictEqual(commentLines[2], '//[WHEN] the when part');
        assert.strictEqual(commentLines[3], '//[THEN] the then part');
        assert.strictEqual(commentLines[4], '//[THEN] a second then part');
    });

    test('getDevOpsTestStepsForTestItems returns DevOpsTestStep[] for a test item', async () => {
        const text = `codeunit 50100 "Test Codeunit"
    [Test]
    procedure ThisIsATestMethod()
    begin
        //[GIVEN] a customer
        //[GIVEN] a sales order for that customer
        //[WHEN] the sales order is posted
        //[THEN] a posted sales invoice is created
        //[THEN] a customer ledger entry is created
    end;`;
        const doc = await createTextDocument('21.al', text);
        let testItem: vscode.TestItem = testController.createTestItem('ThisIsATestMethod', 'ThisIsATestMethod', doc.uri);
        testItem.range = new vscode.Range(2, 13, 2, 31);
        const testSteps: DevOpsTestStep[] = await getDevOpsTestStepsForTestItems(testItem);

        assert.strictEqual(testSteps.length, 4);
    });
});