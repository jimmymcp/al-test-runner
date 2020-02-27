# Change Log

## 0.2.5
- Pre and Post Test Commands - enter a PowerShell command to be executed before or after the tests have run - [see here](https://jpearson.blog/al-test-runner-for-visual-studio-code/) for more information

## 0.2.4
- Bug fix, do not error if a test codeunit cannot be found using the glob pattern in settings
- Retry outputting test results if the promise is rejected e.g. because the result file cannot be read

## 0.2.3
- Remove last.xml result file before test run, if it exists - prevents the results from being output otherwise

## 0.2.2
- Bug fix for screwy test results in output window. Finding the file and line number for a failing tests causes a watch event, which triggers the test results to be output again and all kinds of hell break loose

## 0.2.1
- New "Open Config File" command opens/creates a AL Test Runner Config file
- Config file created like this is more human-readable - now includes line breaks

## 0.2.0
- Support for executing tests on remote Docker host with PS Remoting - big thanks to MaxBelohoubek for submitting the initial changes and testing
- New keys in config.json file to support remote host:
-- dockerHost: the name of the Docker host that a PSSession will be opened to (blank indicates that the local machine is the Docker host - no PowerShell session will be created)
-- newPSSessionOptions: optional switches that should be used with New-PSSession when creating the session to the Docker host
-- vmUserName, vmSecurePassword - credentials used to connect to Docker host
-- remoteContainerName - the name of the container to execute PowerShell against on the Docker host
- new VS Code commands to set credentials for Docker host and container

## 0.1.17
- await completion of command to publish app to container to return focus to terminal

## 0.1.16
- Optionally highlight the line that caused an error in a failing test
- Include links to failing test method file:line number in output window. Uses the testCodeunitGlobPattern setting to search for AL test codeunits. By default this looks for any .al files in the workspace. Setting a more specific [glob pattern](https://en.wikipedia.org/wiki/Glob_(programming)) to find test codeunits will improve performance in large workspaces.

## 0.1.15
- Set PowerShell location before running tests (to work correctly with multi-root workspaces)
- Optionally call AL command to publish / rapid publish app before running tests 

## 0.1.14
- Sanitize filenames (for test codeunits that have illegal file name chars) - thanks Leon
- Handle [test] declarations case-insensitively

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