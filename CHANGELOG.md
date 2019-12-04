# Change Log

## 0.1.13
- Bug fix - remove trailing characters from test method names - could result in both untested and pass/fail decoration for the same test
- Show number of failing tests in output window summary

## 0.1.12
- Support for multi-root workspaces
-- Run All Tests command will require an open editor to determine which folder (and extension) to run the tests in
- Optional parameters included for commands to allow them to be called from other VS Code extensions
- Round test execution times to 2 decimal places in output window

## 0.1.11
- Bug fix - creating .altestrunner directory when it already exists
- Test containers exist and are running before attempting to run tests
- Add parameters to commands
- Don't decorate untested methods that have been commented out

## 0.1.7
- Bug fix - results for tests in xml file that aren't present in test codeunit causes test decorations to fail

## 0.1.6
- Fix to Get-ContainerIsRunning - thanks to Christian Sell

## 0.1.5
- Write results of test run to output window for improved visibility
- Test the Docker container is running before attempting to run tests

![Results in Output Window](https://jpearsondotblog.files.wordpress.com/2019/11/test-results-in-output-window.jpg)

## 0.1.4
- Command to clear credentials

## 0.1.3
- Bug fix to clear decorations
- Improved test selection for running current test and tests in current codeunit
- Stop executing script when credentials required but not entered

## 0.1.2
- Update readme
- Fix for settings to apply without reloading window

## 0.1.1
- Fix default failing test color

## 0.1.0
Initial release
- Commands to run current test, tests in current codeunit, all tests
- Decoration of test methods with customisable colors for passing/failing/untested tests
- Command to clear test results