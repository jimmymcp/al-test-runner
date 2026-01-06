import * as assert from 'assert';
import * as vscode from 'vscode';
import { createOutputParser } from '../../testOutputParser';


const TERMINAL_OUTPUT_WIDE = String.raw`=== Terminal Debug Log - 2025-12-07T20:51:38.080Z ===

]633;C[38;5;10mRunning tests on bcserver, company CRONUS SE, tenant default, extension The Library Tester, test runner 130450, culture en-US
[m
[38;5;10m[mUsing Container
Connecting to http://localhost:80/BC/cs?tenant=default&company=CRONUS%20SE
Setting test codeunit range ''
  Codeunit 70450 LIB Library Member Tests Success (3.063 seconds)
    Testfunction TestCreateLibraryMember Success (0.016 seconds)
    Testfunction TestLibraryMemberEmailValidation Success (0.007 seconds)
    Testfunction TestLibraryMemberInvalidEmail Success (3.033 seconds)
    Testfunction TestLibraryMemberMembershipTypes Success (0.007 seconds)
  Codeunit 70451 LIB Library Author Tests Failure (2.034 seconds)
    Testfunction TestCreateAuthor Success (0.01 seconds)
    Testfunction TestAuthorISNIValidation Failure (0.01 seconds)
      Error:
        This is an error
      Call Stack:
        LIB Library Author Tests(CodeUnit 70451).TestAuthorISNIValidation line 8 - The Library Tester by Johannes Wikman version 1.0.0.2
        Test Runner - Mgt(CodeUnit 130454).RunTests line 26 - Test Runner by Microsoft version 27.1.41698.42333
        Test Runner - Isol. Codeunit(CodeUnit 130450).OnRun(Trigger) line 4 - Test Runner by Microsoft version 27.1.41698.42333
        Test Suite Mgt.(CodeUnit 130456).RunTests line 2 - Test Runner by Microsoft version 27.1.41698.42333
        Test Suite Mgt.(CodeUnit 130456).RunSelectedTests line 35 - Test Runner by Microsoft version 27.1.41698.42333
        Test Suite Mgt.(CodeUnit 130456).RunNextTest line 20 - Test Runner by Microsoft version 27.1.41698.42333
        Command Line Test Tool(Page 130455).RunNextTest - OnAction(Trigger) line 7 - Test Runner by Microsoft version 27.1.41698.42333
    Testfunction TestAuthorInvalidISNI Success (0.007 seconds)
    Testfunction TestAuthorORCIDValidation Success (2 seconds)
    Testfunction TestAuthorInvalidORCID Success (0.007 seconds)
  Codeunit 70452 LIB Library Book Tests Success (3.056 seconds)
    Testfunction TestCreateBook Success (0.01 seconds)
    Testfunction TestBookISBNValidation Success (0.004 seconds)
    Testfunction TestBookInvalidISBN Success (0.01 seconds)
    Testfunction TestBookPublicationYearValidation Success (0.007 seconds)
    Testfunction TestBookInvalidPublicationYear Success (3.016 seconds)
    Testfunction TestBookQuantityValidation Success (0.003 seconds)
    Testfunction TestBookNegativeQuantity Success (0.006 seconds)
  Codeunit 70453 LIB Library Book Loan Tests Success (3.058 seconds)
    Testfunction TestCreateBookLoan Success (0.013 seconds)
    Testfunction TestBookLoanExpectedReturnDateValidation Success (0.003 seconds)
    Testfunction TestBookLoanInvalidExpectedReturnDate Success (3.02 seconds)
    Testfunction TestBookLoanCannotDeletePosted Success (0.006 seconds)
    Testfunction TestBookLoanPostRequiresMember Success (0.006 seconds)
    Testfunction TestBookLoanPostRequiresLines Success (0.01 seconds)
[38;5;1mAL Test Runner WARNING: Code coverage is enabled but codeCoveragePath is not set in AL Test Runner config.json file. See https://jpearson.blog/2021[m
[38;5;1m[17;147H1/02/07/measuring-code-coverage-in-business-central-with-al-test-runner/ for more information.
[m
[38;5;1m[mDownloading performance profile to ./.altestrunner/PerformanceProfile.alcpuprofile

[?25l[147C[17;1H[120X[?25hCopy from container bcserver (C:\ProgramData\BcContainerHelper\Extensions\bcserver\my\2ec85166-5190-494b-8622-a0036b4a6210.xml) to d:\VSCode\Git\GitHub\TheLibrary\TestApp\.altestrunner\2ec85166-5190-494b-8622-a0036b4a6210.xml
[?25l
[17;1H
[17;1H[?25h
=== Log closed at 2025-12-07T20:52:08.302Z ===
`;
const TERMINAL_OUTPUT_WRAPPED = String.raw`=== Terminal Debug Log - 2025-12-07T20:48:33.531Z ===

]633;C[38;5;10mRunning test[m
[38;5;10m[17;12Hts on bcserve[m
[38;5;10m[17;12Her, company C[m
[38;5;10m[17;12HCRONUS SE, te[m
[38;5;10m[17;12Henant default[m
[38;5;10m[17;12Ht, extension [m
[38;5;10m[17;12H The Library [m
[38;5;10m[17;12H Tester, test[m
[38;5;10m[17;12Ht runner 1304[m
[38;5;10m[17;12H450, culture [m
[38;5;10m[17;12H en-US
[m
[38;5;10m[mUsing Contai
[17;12Hiner
Connecting t
[17;12Hto http://loc
[17;12Hcalhost:80/BC
[17;12HC/cs?tenant=d
[17;12Hdefault&compa
[17;12Hany=CRONUS%20
[17;12H0SE
Setting test
[17;12Ht codeunit ra
[17;12Hange ''
  Codeunit 7
[17;12H70450 LIB Lib
[17;12Hbrary Member
[17;12H Tests Succes
[17;12Hss (3.045 sec
[17;12Hconds)
    Testfunc
[17;12Hction TestCre
[17;12HeateLibraryMe
[17;12Hember Success
[17;12Hs (0.02 secon
[17;12Hnds)
    Testfunc
[17;12Hction TestLib
[17;12HbraryMemberEm
[17;12HmailValidatio
[17;12Hon Success (0
[17;12H0.003 seconds
[17;12Hs)
    Testfunc
[17;12Hction TestLib
[17;12HbraryMemberIn
[17;12HnvalidEmail S
[17;12HSuccess (3.01
[17;12H16 seconds)
    Testfunc
[17;12Hction TestLib
[17;12HbraryMemberMe
[17;12HembershipType
[17;12Hes Success (0
[17;12H0.006 seconds
[17;12Hs)
  Codeunit 7
[17;12H70451 LIB Lib
[17;12Hbrary Author
[17;12H Tests Failur
[17;12Hre (2.039 sec
[17;12Hconds)
    Testfunc
[17;12Hction TestCre
[17;12HeateAuthor Su
[17;12Huccess (0.01
[17;12H seconds)
    Testfunc
[17;12Hction TestAut
[17;12HthorISNIValid
[17;12Hdation Failur
[17;12Hre (0.01 seco
[17;12Honds)
      Error:[18;1H
        This
[17;12Hs is an error[18;1H
      Call S
[17;12HStack:
        LIB
[17;12H Library Auth
[17;12Hhor Tests(Cod
[17;12HdeUnit 70451)
[17;12H).TestAuthorI
[17;12HISNIValidatio
[17;12Hon line 8 - T
[17;12HThe Library T
[17;12HTester by Joh
[17;12Hhannes Wikman
[17;12Hn version 1.0
[17;12H0.0.2
        Test
[17;12Ht Runner - Mg
[17;12Hgt(CodeUnit 1
[17;12H130454).RunTe
[17;12Hests line 26
[17;12H - Test Runne
[17;12Her by Microso
[17;12Hoft version 2
[17;12H27.1.41698.42
[17;12H2333
        Test
[17;12Ht Runner - Is
[17;12Hsol. Codeunit
[17;12Ht(CodeUnit 13
[17;12H30450).OnRun(
[17;12H(Trigger) lin
[17;12Hne 4 - Test R
[17;12HRunner by Mic
[17;12Hcrosoft versi
[17;12Hion 27.1.4169
[17;12H98.42333
        Test
[17;12Ht Suite Mgt.(
[17;12H(CodeUnit 130
[17;12H0456).RunTest
[17;12Hts line 2 - T
[17;12HTest Runner b
[17;12Hby Microsoft
[17;12H version 27.1
[17;12H1.41698.42333[18;1H
        Test
[17;12Ht Suite Mgt.(
[17;12H(CodeUnit 130
[17;12H0456).RunSele
[17;12HectedTests li
[17;12Hine 35 - Test
[17;12Ht Runner by M
[17;12HMicrosoft ver
[17;12Hrsion 27.1.41
[17;12H1698.42333
        Test
[17;12Ht Suite Mgt.(
[17;12H(CodeUnit 130
[17;12H0456).RunNext
[17;12HtTest line 20
[17;12H0 - Test Runn
[17;12Hner by Micros
[17;12Hsoft version
[17;12H 27.1.41698.4
[17;12H42333
        Comm
[17;12Hmand Line Tes
[17;12Hst Tool(Page
[17;12H 130455).RunN
[17;12HNextTest - On
[17;12HnAction(Trigg
[17;12Hger) line 7 -
[17;12H- Test Runner
[17;12Hr by Microsof
[17;12Hft version 27
[17;12H7.1.41698.423
[17;12H333
    Testfunc
[17;12Hction TestAut
[17;12HthorInvalidIS
[17;12HSNI Success (
[17;12H(0.006 second
[17;12Hds)
    Testfunc
[17;12Hction TestAut
[17;12HthorORCIDVali
[17;12Hidation Succe
[17;12Hess (2.003 se
[17;12Heconds)
    Testfunc
[17;12Hction TestAut
[17;12HthorInvalidOR
[17;12HRCID Success
[17;12H (0.01 second
[17;12Hds)
  Codeunit 7
[17;12H70452 LIB Lib
[17;12Hbrary Book Te
[17;12Hests Success
[17;12H (3.072 secon
[17;12Hnds)
    Testfunc
[17;12Hction TestCre
[17;12HeateBook Succ
[17;12Hcess (0.01 se
[17;12Heconds)
    Testfunc
[17;12Hction TestBoo
[17;12HokISBNValidat
[17;12Htion Success
[17;12H (0.007 secon
[17;12Hnds)
    Testfunc
[17;12Hction TestBoo
[17;12HokInvalidISBN
[17;12HN Success (0.
[17;12H.007 seconds)[18;1H
    Testfunc
[17;12Hction TestBoo
[17;12HokPublication
[17;12HnYearValidati
[17;12Hion Success (
[17;12H(0.007 second
[17;12Hds)
    Testfunc
[17;12Hction TestBoo
[17;12HokInvalidPubl
[17;12HlicationYear
[17;12H Success (3.0
[17;12H03 seconds)
    Testfunc
[17;12Hction TestBoo
[17;12HokQuantityVal
[17;12Hlidation Succ
[17;12Hcess (0.004 s
[17;12Hseconds)
    Testfunc
[17;12Hction TestBoo
[17;12HokNegativeQua
[17;12Hantity Succes
[17;12Hss (0.007 sec
[17;12Hconds)
  Codeunit 7
[17;12H70453 LIB Lib
[17;12Hbrary Book Lo
[17;12Hoan Tests Suc
[17;12Hccess (3.073
[17;12H seconds)
    Testfunc
[17;12Hction TestCre
[17;12HeateBookLoan
[17;12H Success (0.0
[17;12H016 seconds) [18;1H
    Testfunc
[17;12Hction TestBoo
[17;12HokLoanExpecte
[17;12HedReturnDateV
[17;12HValidation Su
[17;12Huccess (0.007
[17;12H7 seconds)
    Testfunc
[17;12Hction TestBoo
[17;12HokLoanInvalid
[17;12HdExpectedRetu
[17;12HurnDate Succe
[17;12Hess (3.023 se
[17;12Heconds)
    Testfunc
[17;12Hction TestBoo
[17;12HokLoanCannotD
[17;12HDeletePosted
[17;12H Success (0.0
[17;12H007 seconds) [18;1H
    Testfunc
[17;12Hction TestBoo
[17;12HokLoanPostReq
[17;12HquiresMember
[17;12H Success (0.0
[17;12H007 seconds) [18;1H
    Testfunc
[17;12Hction TestBoo
[17;12HokLoanPostReq
[17;12HquiresLines S
[17;12HSuccess (0.01
[17;12H13 seconds)
[38;5;1mAL Test Runn[m
[38;5;1m[17;12Hner WARNING: [m
[38;5;1m[17;12H Code coverag[m
[38;5;1m[17;12Hge is enabled[m
[38;5;1m[17;12Hd but codeCov[m
[38;5;1m[17;12HveragePath is[m
[38;5;1m[17;12Hs not set in [m
[38;5;1m[17;12H AL Test Runn[m
[38;5;1m[17;12Hner config.js[m
[38;5;1m[17;12Hson file. See[m
[38;5;1m[17;12He https://jpe[m
[38;5;1m[17;12Hearson.blog/2[m
[38;5;1m[17;12H2021/02/07/me[m
[38;5;1m[17;12Heasuring-code[m
[38;5;1m[17;12He-coverage-in[m
[38;5;1m[17;12Hn-business-ce[m
[38;5;1m[17;12Hentral-with-a[m
[38;5;1m[17;12Hal-test-runne[m
[38;5;1m[17;12Her/ for more [m
[38;5;1m[17;12H information.[18;1H[m
[38;5;1m[mDownloading
[17;12H performance
[17;12H profile to .
[17;12H./.altestrunn
[17;12Hner/Performan
[17;12HnceProfile.al
[17;12Hlcpuprofile
[?25l
[33m[1m[17;1HReadin. [[7mDownloaded: 0 B[m
[33m[1m[7m[17;12HBytes of 0 By[m
[17;1H            [33m[1m[7mtes[27m][22m        [17;1H[?25h[mCopy from container bcse
[17;12Herver (C:\Pro
[17;12HogramData\BcC
[17;12HContainerHelp
[17;12Hper\Extension
[17;12Hns\bcserver\m
[17;12Hmy\0f83406e-c
[17;12Hca4e-46b9-84f
[17;12Hf9-8fd5c63553
[17;12H3cb.xml) to d
[17;12Hd:\VSCode\Git
[17;12Ht\GitHub\TheL
[17;12HLibrary\TestA
[17;12HApp\.altestru
[17;12Hunner\0f83406
[17;12H6e-ca4e-46b9-
[17;12H-84f9-8fd5c63
[17;12H3553cb.xml
[?25l
[33m[1m[17;1HCopied. [[7m5,2 KB of 5,2 K[m
[33m[1m[7m[17;12HKB (0,0 MB/s)[?25l[m
[17;1H            [33m[1m][22m[K[17;1H[?25h
=== Log closed at 2025-12-07T20:49:04.079Z ===
`;

/**
 * TERMINAL WIDTH VARIATION TESTS
 *
 * These tests verify that the parser handles terminal output correctly regardless of terminal width.
 * They use real-world terminal output captured from Business Central test runs:
 * - Wide terminal (no wrapping) - clean output with complete lines
 * - Narrow terminal (wrapping) - output with ANSI cursor positioning codes ([17;12H)
 *
 * Both should produce identical test results despite different formatting.
 */

suite('Terminal Width Variation Tests', () => {
    let testController: vscode.TestController;
    let testRun: vscode.TestRun;
    let testRequest: vscode.TestRunRequest;

    // Helper to create a complete test structure for 4 codeunits
    function createCompleteTestStructure(): Map<string, vscode.TestItem> {
        testController = vscode.tests.createTestController('test-width-variation', 'Terminal Width Variation Tests');

        const items = new Map<string, vscode.TestItem>();

        // Codeunit 70450 - LIB Library Member Tests (4 tests, all passing)
        const codeunit1 = testController.createTestItem('70450', '70450 LIB Library Member Tests', undefined);
        items.set('70450.TestCreateLibraryMember', testController.createTestItem('70450.TestCreateLibraryMember', 'TestCreateLibraryMember', undefined));
        items.set('70450.TestLibraryMemberEmailValidation', testController.createTestItem('70450.TestLibraryMemberEmailValidation', 'TestLibraryMemberEmailValidation', undefined));
        items.set('70450.TestLibraryMemberInvalidEmail', testController.createTestItem('70450.TestLibraryMemberInvalidEmail', 'TestLibraryMemberInvalidEmail', undefined));
        items.set('70450.TestLibraryMemberMembershipTypes', testController.createTestItem('70450.TestLibraryMemberMembershipTypes', 'TestLibraryMemberMembershipTypes', undefined));
        codeunit1.children.add(items.get('70450.TestCreateLibraryMember')!);
        codeunit1.children.add(items.get('70450.TestLibraryMemberEmailValidation')!);
        codeunit1.children.add(items.get('70450.TestLibraryMemberInvalidEmail')!);
        codeunit1.children.add(items.get('70450.TestLibraryMemberMembershipTypes')!);
        testController.items.add(codeunit1);

        // Codeunit 70451 - LIB Library Author Tests (5 tests, 1 failure)
        const codeunit2 = testController.createTestItem('70451', '70451 LIB Library Author Tests', undefined);
        items.set('70451.TestCreateAuthor', testController.createTestItem('70451.TestCreateAuthor', 'TestCreateAuthor', undefined));
        items.set('70451.TestAuthorISNIValidation', testController.createTestItem('70451.TestAuthorISNIValidation', 'TestAuthorISNIValidation', undefined));
        items.set('70451.TestAuthorInvalidISNI', testController.createTestItem('70451.TestAuthorInvalidISNI', 'TestAuthorInvalidISNI', undefined));
        items.set('70451.TestAuthorORCIDValidation', testController.createTestItem('70451.TestAuthorORCIDValidation', 'TestAuthorORCIDValidation', undefined));
        items.set('70451.TestAuthorInvalidORCID', testController.createTestItem('70451.TestAuthorInvalidORCID', 'TestAuthorInvalidORCID', undefined));
        codeunit2.children.add(items.get('70451.TestCreateAuthor')!);
        codeunit2.children.add(items.get('70451.TestAuthorISNIValidation')!);
        codeunit2.children.add(items.get('70451.TestAuthorInvalidISNI')!);
        codeunit2.children.add(items.get('70451.TestAuthorORCIDValidation')!);
        codeunit2.children.add(items.get('70451.TestAuthorInvalidORCID')!);
        testController.items.add(codeunit2);

        // Codeunit 70452 - LIB Library Book Tests (7 tests, all passing)
        const codeunit3 = testController.createTestItem('70452', '70452 LIB Library Book Tests', undefined);
        items.set('70452.TestCreateBook', testController.createTestItem('70452.TestCreateBook', 'TestCreateBook', undefined));
        items.set('70452.TestBookISBNValidation', testController.createTestItem('70452.TestBookISBNValidation', 'TestBookISBNValidation', undefined));
        items.set('70452.TestBookInvalidISBN', testController.createTestItem('70452.TestBookInvalidISBN', 'TestBookInvalidISBN', undefined));
        items.set('70452.TestBookPublicationYearValidation', testController.createTestItem('70452.TestBookPublicationYearValidation', 'TestBookPublicationYearValidation', undefined));
        items.set('70452.TestBookInvalidPublicationYear', testController.createTestItem('70452.TestBookInvalidPublicationYear', 'TestBookInvalidPublicationYear', undefined));
        items.set('70452.TestBookQuantityValidation', testController.createTestItem('70452.TestBookQuantityValidation', 'TestBookQuantityValidation', undefined));
        items.set('70452.TestBookNegativeQuantity', testController.createTestItem('70452.TestBookNegativeQuantity', 'TestBookNegativeQuantity', undefined));
        codeunit3.children.add(items.get('70452.TestCreateBook')!);
        codeunit3.children.add(items.get('70452.TestBookISBNValidation')!);
        codeunit3.children.add(items.get('70452.TestBookInvalidISBN')!);
        codeunit3.children.add(items.get('70452.TestBookPublicationYearValidation')!);
        codeunit3.children.add(items.get('70452.TestBookInvalidPublicationYear')!);
        codeunit3.children.add(items.get('70452.TestBookQuantityValidation')!);
        codeunit3.children.add(items.get('70452.TestBookNegativeQuantity')!);
        testController.items.add(codeunit3);

        // Codeunit 70453 - LIB Library Book Loan Tests (6 tests, all passing)
        const codeunit4 = testController.createTestItem('70453', '70453 LIB Library Book Loan Tests', undefined);
        items.set('70453.TestCreateBookLoan', testController.createTestItem('70453.TestCreateBookLoan', 'TestCreateBookLoan', undefined));
        items.set('70453.TestBookLoanExpectedReturnDateValidation', testController.createTestItem('70453.TestBookLoanExpectedReturnDateValidation', 'TestBookLoanExpectedReturnDateValidation', undefined));
        items.set('70453.TestBookLoanInvalidExpectedReturnDate', testController.createTestItem('70453.TestBookLoanInvalidExpectedReturnDate', 'TestBookLoanInvalidExpectedReturnDate', undefined));
        items.set('70453.TestBookLoanCannotDeletePosted', testController.createTestItem('70453.TestBookLoanCannotDeletePosted', 'TestBookLoanCannotDeletePosted', undefined));
        items.set('70453.TestBookLoanPostRequiresMember', testController.createTestItem('70453.TestBookLoanPostRequiresMember', 'TestBookLoanPostRequiresMember', undefined));
        items.set('70453.TestBookLoanPostRequiresLines', testController.createTestItem('70453.TestBookLoanPostRequiresLines', 'TestBookLoanPostRequiresLines', undefined));
        codeunit4.children.add(items.get('70453.TestCreateBookLoan')!);
        codeunit4.children.add(items.get('70453.TestBookLoanExpectedReturnDateValidation')!);
        codeunit4.children.add(items.get('70453.TestBookLoanInvalidExpectedReturnDate')!);
        codeunit4.children.add(items.get('70453.TestBookLoanCannotDeletePosted')!);
        codeunit4.children.add(items.get('70453.TestBookLoanPostRequiresMember')!);
        codeunit4.children.add(items.get('70453.TestBookLoanPostRequiresLines')!);
        testController.items.add(codeunit4);

        return items;
    }

    // Helper to create test run for all codeunits
    function createTestRunForAll(): vscode.TestRun {
        const allCodeunits: vscode.TestItem[] = [];
        testController.items.forEach(item => allCodeunits.push(item));
        testRequest = new vscode.TestRunRequest(allCodeunits);
        return testController.createTestRun(testRequest);
    }

    // Helper to track and validate test run calls
    interface TestRunTracker {
        started: string[];
        passed: string[];
        failed: Array<{ testName: string; errorMessage: string }>;
    }

    function createTestRunTracker(run: vscode.TestRun): TestRunTracker {
        const tracker: TestRunTracker = {
            started: [],
            passed: [],
            failed: []
        };

        const originalStarted = run.started.bind(run);
        const originalPassed = run.passed.bind(run);
        const originalFailed = run.failed.bind(run);

        run.started = (test: vscode.TestItem) => {
            tracker.started.push(test.label);
            originalStarted(test);
        };

        run.passed = (test: vscode.TestItem) => {
            tracker.passed.push(test.label);
            originalPassed(test);
        };

        run.failed = (test: vscode.TestItem, message: vscode.TestMessage | readonly vscode.TestMessage[]) => {
            const msg = Array.isArray(message) ? message[0].message : (message as vscode.TestMessage).message;
            tracker.failed.push({ testName: test.label, errorMessage: msg });
            originalFailed(test, message);
        };

        return tracker;
    }

    teardown(() => {
        if (testController) {
            testController.dispose();
        }
    });

    test('Parser handles wide terminal output (4 codeunits, 22 tests, 1 failure)', () => {
        createCompleteTestStructure();
        testRun = createTestRunForAll();
        const tracker = createTestRunTracker(testRun);
        const parser = createOutputParser(testRun, testRequest);

        // Use embedded terminal output constant
        const terminalOutput = TERMINAL_OUTPUT_WIDE;

        // Parse the output
        parser(terminalOutput);

        // Verify counts
        assert.strictEqual(tracker.started.length, 22, 'Should have started 22 tests');
        assert.strictEqual(tracker.passed.length, 21, 'Should have passed 21 tests');
        assert.strictEqual(tracker.failed.length, 1, 'Should have failed 1 test');

        // Verify the failing test
        assert.strictEqual(tracker.failed[0].testName, 'TestAuthorISNIValidation', 'Should fail TestAuthorISNIValidation');
        assert.ok(tracker.failed[0].errorMessage.includes('This is an error'), 'Should capture error message');

        // Verify specific tests from each codeunit ran
        assert.ok(tracker.started.includes('TestCreateLibraryMember'), 'Should start TestCreateLibraryMember (Codeunit 70450)');
        assert.ok(tracker.started.includes('TestCreateAuthor'), 'Should start TestCreateAuthor (Codeunit 70451)');
        assert.ok(tracker.started.includes('TestCreateBook'), 'Should start TestCreateBook (Codeunit 70452)');
        assert.ok(tracker.started.includes('TestCreateBookLoan'), 'Should start TestCreateBookLoan (Codeunit 70453)');
    });

    test('Parser handles wrapped terminal output (4 codeunits, 22 tests, 1 failure)', () => {
        createCompleteTestStructure();
        testRun = createTestRunForAll();
        const tracker = createTestRunTracker(testRun);
        const parser = createOutputParser(testRun, testRequest);

        // Use embedded wrapped terminal output constant
        const terminalOutput = TERMINAL_OUTPUT_WRAPPED;

        // Parse the output
        parser(terminalOutput);

        // Verify counts - should be IDENTICAL to wide terminal
        assert.strictEqual(tracker.started.length, 22, 'Should have started 22 tests (same as wide terminal)');
        assert.strictEqual(tracker.passed.length, 21, 'Should have passed 21 tests (same as wide terminal)');
        assert.strictEqual(tracker.failed.length, 1, 'Should have failed 1 test (same as wide terminal)');

        // Verify the failing test - should be IDENTICAL to wide terminal
        assert.strictEqual(tracker.failed[0].testName, 'TestAuthorISNIValidation', 'Should fail TestAuthorISNIValidation (same as wide terminal)');
        assert.ok(tracker.failed[0].errorMessage.includes('This is an error'), 'Should capture error message (same as wide terminal)');

        // Verify specific tests from each codeunit ran
        assert.ok(tracker.started.includes('TestCreateLibraryMember'), 'Should start TestCreateLibraryMember (Codeunit 70450)');
        assert.ok(tracker.started.includes('TestCreateAuthor'), 'Should start TestCreateAuthor (Codeunit 70451)');
        assert.ok(tracker.started.includes('TestCreateBook'), 'Should start TestCreateBook (Codeunit 70452)');
        assert.ok(tracker.started.includes('TestCreateBookLoan'), 'Should start TestCreateBookLoan (Codeunit 70453)');
    });

    test('Wide and wrapped terminal outputs produce identical results', () => {
        // This test validates that both terminal widths produce the exact same test results

        // Test 1: Wide terminal
        createCompleteTestStructure();
        const testRun1 = createTestRunForAll();
        const tracker1 = createTestRunTracker(testRun1);
        const parser1 = createOutputParser(testRun1, testRequest);

        parser1(TERMINAL_OUTPUT_WIDE);

        // Cleanup first controller
        testController.dispose();

        // Test 2: Wrapped terminal
        createCompleteTestStructure();
        const testRun2 = createTestRunForAll();
        const tracker2 = createTestRunTracker(testRun2);
        const parser2 = createOutputParser(testRun2, testRequest);

        parser2(TERMINAL_OUTPUT_WRAPPED);

        // Compare results
        assert.strictEqual(tracker1.started.length, tracker2.started.length, 'Should start same number of tests');
        assert.strictEqual(tracker1.passed.length, tracker2.passed.length, 'Should pass same number of tests');
        assert.strictEqual(tracker1.failed.length, tracker2.failed.length, 'Should fail same number of tests');

        // Verify started tests are identical (order matters for BC sequential execution)
        tracker1.started.forEach((testName, index) => {
            assert.strictEqual(testName, tracker2.started[index], `Started test ${index} should match: ${testName}`);
        });

        // Verify passed tests are identical
        const passed1Sorted = [...tracker1.passed].sort();
        const passed2Sorted = [...tracker2.passed].sort();
        passed1Sorted.forEach((testName, index) => {
            assert.strictEqual(testName, passed2Sorted[index], `Passed test ${index} should match: ${testName}`);
        });

        // Verify failed tests are identical
        assert.strictEqual(tracker1.failed.length, tracker2.failed.length, 'Should have same number of failures');
        tracker1.failed.forEach((failure, index) => {
            assert.strictEqual(failure.testName, tracker2.failed[index].testName, `Failed test ${index} name should match`);
            // Note: Error messages might have slight formatting differences due to line wrapping, so we just check for key content
            assert.ok(tracker2.failed[index].errorMessage.includes('This is an error'), `Failed test ${index} should contain error message`);
        });
    });
});
