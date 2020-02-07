# AL Test Runner

The AL Test Runner extension adds features to help run your Business Central tests and digest the results in VS Code. Run specified tests against your Business Central Docker container and save the results. Test methods are decorated according to the test results. Hover over the method name for more information.

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
- A Business Central Docker container that you can publish your extension into and run your tests against. As of v0.2.0, Docker can either be running locally or on a remote server. If remote, you must be able to execute PowerShell commands against the host with ps-remoting.
- Alternatively you can use VS Code remote development to execute local PowerShell commands on the host with this extension installed on the host 
- [AL Language extension](https://marketplace.visualstudio.com/items?itemName=ms-dynamics-smb.al) for VS Code
- [navcontainerhelper PowerShell module](https://freddysblog.com/category/navcontainerhelper/) (minimum version 0.6.4.18)

## Extension Settings
- decorateTestMethods: switch decoration for test methods on/off
- passingTestsColor: the background color to decorate passing tests with
- failingTestsColor: the background color to decorate failing tests with
- untestedTestsColor: the background color to decorate untested tests with
- publishBeforeTest: determines whether to publish the app to the container before running the test(s) - select between publishing and rapid application publishing
- highlightFailingLine: whether to decorate the line of code in a test method that has resulted in an error
- failingLineDecoration: the decoration to apply to the failing line in a test method
- testCodeunitGlobPattern: the glob pattern that identifies test codeunits e.g. **/Tests/*.codeunit.al will search for files ending in .codeunit.al in a folder called Tests. By default the extension will search through all .al files in the workspace. Enter a more specific glob pattern here to improve performance or remove altogether.

## Known Issues
- When running tests for the first time after loading the extension the terminal that is created to execute the PowerShell commands doesn't show any output - not sure why - the command is running in the background though
- There is a known bug with the Business Central test tool that causes the PowerShell test runner to fail. This extension will automatically run the command again and the tests should execute successfully second time