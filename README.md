# AL Test Runner

The AL Test Runner extension adds features to help run your Business Central tests and digest the results in VS Code. Run specified tests against your local Business Central Docker container and save the results. Test methods are decorated according to the test results. Hover over the method name for more information.

## Features

### Running Tests
Adds new commands to easily run:
- The current test
- All tests in the current codeunit
- All tests in the current extension

![Run Current Test](https://jpearsondotblog.files.wordpress.com/2019/11/run-current-test.gif)

### Decorate Test Methods According to Test Results
- Configure background colors for passing, failing and untested test methods
- Extra details when hovering over the method name e.g. error message and callstack when hovering over failing test

![Hover Over Failing Test](https://jpearsondotblog.files.wordpress.com/2019/11/hover-over-failing-test.gif)

### Snippet for Test Methods
"ttestprocedure" creates a new global procedure with the [Test] decoration and GIVEN, WHEN, THEN comments ready for you to fill out. The test is immediately highlighted to indicate that it has not been run.

![Snippet for Test Methods](https://jpearsondotblog.files.wordpress.com/2019/11/test-procedure-snippet.gif)

## Requirements
This extension is to help run tests on a **local** Docker container i.e. VS Code must be running on the Docker host.
- A local Business Central Docker container that you can publish your extension into and run your tests against
- [AL Language extension](https://marketplace.visualstudio.com/items?itemName=ms-dynamics-smb.al) for VS Code
- [navcontainerhelper PowerShell module](https://freddysblog.com/category/navcontainerhelper/) (minimum version 0.6.4.18)

## Extension Settings
- decorateTestMethods: switch decoration for test methods on/off
- passingTestsColor: the background color to decorate passing tests with
- failingTestsColor: the background color to decorate failing tests with
- untestedTestsColor: the background color to decorate untested tests with

## Known Issues
- When running tests for the first time after loading the extension the terminal that is created to execute the PowerShell commands doesn't show any output - not sure why - the command is running in the background though
- There is a known bug with the Business Central test tool that causes the PowerShell test runner to fail. This extension will automatically run the command again and the tests should execute successfully second time