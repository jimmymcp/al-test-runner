# Change Log

## 0.8.1
- Thanks to CPSTOS for contributing support for AAD authentication against a local Docker container [https://github.com/jimmymcp/al-test-runner/pull/77](https://github.com/jimmymcp/al-test-runner/pull/77)
- Tidy up some obsolete activation events in package.json

## 0.8.0
- Improvements to debugging, better messages when setup incomplete, better checks before attempting to debug tests
- Automatically attempt to install Test Runner Service app when required
- Automatically suggest testRunnerServiceUrl when required
- Change Publish Before Test default value to Publish
- Flash result of test run into status bar

## 0.7.13
- Add culture to config file, pass to Run-TestsInBcContainer [issue 70](https://github.com/jimmymcp/al-test-runner/issues/70)
- Open al-test-runner-2 (for Show Table Data action) to the test folder [issue 67](https://github.com/jimmymcp/al-test-runner/issues/67)

## 0.7.12
- Exclude methods which have been commented out from code lens, test explorer - [issue 68](https://github.com/jimmymcp/al-test-runner/issues/68)

## 0.7.11
- Test Coverage Map - see [https://jimmymcp.github.io/al-test-runner-docs/articles/test-coverage.html](https://jimmymcp.github.io/al-test-runner-docs/articles/test-coverage.html)

## 0.7.10
- Fix issue 65 - new file editor opens when running tests when ```Test Folder Name``` extension setting is not set. Improved error handling and telemetry for errors.

## 0.7.9
- Support for running selected tests from the Test Explorer. All other tests are excluded through use of the DisabledTests parameter in the bccontainerhelper module

## 0.7.8
- Do not include testRunnerCodeunitId parameter when running tests in BC14 container - [issue 63](https://github.com/jimmymcp/al-test-runner/issues/63)
- Telemetry update

## 0.7.7
- Optionally publish apps using PowerShell rather than running AL extension commands. Allows for better control of when to stop a test run if publishing the app has failed for any reason

## 0.6.7
- Updates to telemetry

## 0.6.6
- Initial version of telemetry. See [https://jpearson.blog/al-test-runner-for-visual-studio-code#telemetry](https://jpearson.blog/al-test-runner-for-visual-studio-code#telemetry) for more information

## 0.6.5
- Test if PowerShell module is imported when fetching al-test-runner terminal

## 0.6.4
- Bump dependency version of ansi-regex

## 0.6.3
- Stability improvements

## 0.6.2
- Open app.json of the test app before publishing on running tests. This is to ensure that the publish command provided by the AL extension publishes the correct app before running the tests.
- Fix an assumption that the object declaration for a test codeunit must be on the first line of the file.

## 0.6.1
- Get-ServerFromLaunchJson: remove colon and port number from server name if present

## 0.6.0
- Support for VS Code Testing API

## 0.5.9
- Optionally output test results to an editor instead of the output window.

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