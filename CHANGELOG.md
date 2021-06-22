# Change Log

## 0.5.8
- Respect code warnings

## 0.5.7
- Add total code lines, lines hit and percentage to code coverage summary.

## 0.5.6
- Fix issue finding config file in single-root workspaces introduced in previous version.

## 0.5.5
- Look for AL Test Runner config in any of the subfolers of the current location's parent folder i.e. better support for multiroot workspace where test config is in a different folder to production code

## 0.5.4
- "Show Table Data" command and context menu. Gets the table id for the variable name that was selected and opens the browser to view the data in that browser

## 0.5.3
- Attempt to automatically find the code coverage file if the path is not specified in VS Code settings.

## 0.5.2
- Output a warning when attempting to save code coverage but codeCoveragePath in config.json has not been set
- Change code coverage output to include line stats (number of hit lines / number of lines) instead of the object ID

## 0.5.1
- Test Folder Name setting. Can be set to the name of the workspace folder that contains the test app. Useful for running all tests while the editor is open to the production app code in a multi-root workspace.

## 0.5.0
- Initial version of code coverage see [https://jpearson.blog/2021/02/07/measuring-code-coverage-in-business-central-with-al-test-runner/](https://jpearson.blog/2021/02/07/measuring-code-coverage-in-business-central-with-al-test-runner/) for more information

## 0.4.6
- Include not implemented error in test snippet (to avoid incomplete tests passing by default)

## 0.4.5
- Merged workspace configuration fixes PR (thanks Bjarki)

## 0.4.4
- If tests fail to run then test whether the specified company exists in the container. If not then select a company which does exist.
- Correct typo in debug tests in current codeunit command

## 0.4.3
- JSON validation for AL Test Runner config file

## 0.4.2
- Attempt to find a container result path in the ProgramData folder by default (there seems to be a problem using C:\\bcartifacts.cache)

## 0.4.1
- Support for bccontainerhelper module. AL Test Runner will now check for the availability of bccontainerhelper and import it if available. If not, it will attempt to import the navcontainerhelper module
- Display error details when tests fail to run - should help diagnose the problem e.g. incorrect company name, invalid results file path

## 0.4.0
- Support for debugging tests see [https://jpearson.blog/2020/07/03/debugging-business-central-tests-with-al-test-runner](https://jpearson.blog/2020/07/03/debugging-business-central-tests-with-al-test-runner) for more information

## 0.3.5
- Fix issue 21: handle line and block comments in launch.json file

## 0.3.4
- Fix issue 18: overlapping test decoration for test methods that begin with the name of another test

## 0.3.3
- Get-FileIsTestCodeunit now searches case-insensitively for SubType = Test
- Fix to Invoke-ALTestRunner test

## 0.3.2
- Update minimum versions of packages in package-lock.json to respect security warnings

## 0.3.1
- XUnit result files seem to sometimes be wrong. Test results reported as belonging to the wrong test codeunit. Result was an error when trying to find the line of that test method in that codeunit. Error handled.

## 0.3.0
- Merged pull requests 13 and 14 thanks Marton and Igor

## 0.2.10
- Fix bug introduced in 0.2.9 🤦‍♂️

## 0.2.9
- Handle skipped tests
- Reworking watching for and outputting test results

## 0.2.8
- Showing the contents of the output window seems a little screwy attempt to make it more reliable

## 0.2.7
- Add CodeLens actions to run individual methods or all methods in a test codeunit

## 0.2.6
- unlink result file after results have been output to help prevent error with locked resource
- show test run time when outputting results

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
  - dockerHost: the name of the Docker host that a PSSession will be opened to (blank indicates that the local machine is the Docker host - no PowerShell session will be created)
  - newPSSessionOptions: optional switches that should be used with New-PSSession when creating the session to the Docker host
  - vmUserName, vmSecurePassword - credentials used to connect to Docker host
  - remoteContainerName - the name of the container to execute PowerShell against on the Docker host
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
  - Run All Tests command will require an open editor to determine which folder (and extension) to run the tests in
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