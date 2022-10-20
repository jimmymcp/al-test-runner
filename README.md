# AL Test Runner

AL Test Runner adds features to help you write and run Microsoft Dynamics 365 Business Central tests.

- Run tests
- Debug tests
- Enable code coverage to see which lines are covered by your tests
- See which tests call methods in your codeunits and tables

All without leaving VS Code and integrated with VS Code's Testing pane. For more information see the documentation at: [https://jimmymcp.github.io/al-test-runner-docs/](https://jimmymcp.github.io/al-test-runner-docs/)
## Testing Pane
View, run and debug your tests and test codeunits directly from VS Code's Testing pane.

![](https://jimmymcp.github.io/al-test-runner-docs/images/20220613191553.png)

## Toggle Code Coverage
Toggle code coverage to highlight the lines which are being hit by your test code.

![](https://jimmymcp.github.io/al-test-runner-docs/images/toggle-code-coverage.gif)

## Test Coverage
See which tests hit the methods in your codeunits and tables. Run those tests from a code action in the editor.

![](https://jimmymcp.github.io/al-test-runner-docs/images/show-tests-code-lens.gif)

## Requirements
- A Business Central Docker container that you can publish your extension into and run your tests against. As of v0.2.0, Docker can either be running locally or on a remote server. If remote, you must be able to execute PowerShell commands against the host with ps-remoting.
- Alternatively you can use VS Code remote development to execute local PowerShell commands on the host with this extension installed on the host 
- [AL Language extension](https://marketplace.visualstudio.com/items?itemName=ms-dynamics-smb.al) for VS Code
- [navcontainerhelper PowerShell module](https://freddysblog.com/category/navcontainerhelper/) (minimum version 0.6.4.18)