# AL Test Runner - Copilot Instructions

## Working Principles

**Ask Before Acting:**
- Always ask clarifying questions when requirements are unclear or ambiguous
- Do not make assumptions unless you have VERY HIGH confidence
- Never start changing files without explicitly asking for confirmation first (unless already instructed to modify files)
- Present options and ask for user preference when multiple approaches are viable

## Project Overview

This is a VS Code extension that provides test running capabilities for AL (Application Language) tests in Microsoft Dynamics 365 Business Central development.

**Key Technologies:**
- TypeScript (VS Code extension)
- PowerShell (integration with Business Central Docker containers)
- AL Language (target language for tests)

## Architecture

### TypeScript (src/)
- `extension.ts` - Main extension entry point
- `testController.ts` - VS Code Testing API integration
- `commands.ts` - Command definitions and handlers
- `powershell.ts` - Bridge to PowerShell scripts
- `config.ts` - Extension configuration management

### PowerShell (PowerShell/)
- Core test execution scripts
- Docker container integration via navcontainerhelper module
- Business Central API interactions

## Code Style Guidelines

### TypeScript
- Use async/await for asynchronous operations
- Follow existing VS Code extension patterns
- Maintain strong typing where possible
- Use the output channel (`output.ts`) for logging

### PowerShell
- Each script should be focused on a single responsibility
- Use verb-noun naming convention
- Scripts prefixed with `Get-` retrieve information
- Scripts prefixed with `Invoke-` execute actions

### Comments and Documentation
- **Document current behavior only** - Comments should explain what the code does now, not what it used to do
- **Avoid change documentation in code** - Don't add comments like "Changed from X to Y" or "Previously this did Z"
- **History belongs in git** - Use commit messages for explaining what changed and why
- **Focus on the "why" when unclear** - Comment on non-obvious business logic or workarounds, not on routine implementation details
- **Remove obsolete comments** - When updating code, remove comments that no longer apply

## Important Dependencies

- **navcontainerhelper** - PowerShell module for BC container management (minimum v0.6.4.18)
- **VS Code Testing API** - For test discovery and execution
- **AL Language extension** - Used for building and publishing AL code via commands (`al.package`, `al.publishNoDebug`, `al.incrementalPublishNoDebug`)

## Common Patterns

### Running Tests
Tests are executed by:
1. TypeScript extension triggers PowerShell scripts
2. PowerShell communicates with BC Docker container
3. Results are parsed and displayed in VS Code Testing pane

### Configuration
- Extension configuration via VS Code settings
- `.altestrunner` file in workspace for project-specific settings
- `launch.json` for server/tenant information

## When Making Changes

- **TypeScript changes**: Always run `npm run compile` after making changes to compile and validate the code
- **Adding commands**: Update both `commands.ts` and `package.json` contributions, then compile
- **PowerShell changes**: Test against a running BC Docker container
- **New features**: Consider both Testing pane integration and command palette access

### Build and Validation
After any TypeScript modifications, compile the extension to ensure there are no errors:
```powershell
npm run compile
```

### Test-Driven Development (TDD)

When developing new functionality, use Test-Driven Development where possible:

1. **Write the test first** - Define expected behavior in a test before implementing
2. **Run the test** - Verify it fails (red)
3. **Implement the feature** - Write minimal code to make the test pass
4. **Run the test again** - Verify it passes (green)
5. **Refactor** - Improve the code while keeping tests green

#### Running Tests

The project uses Mocha for unit testing. Tests are located in `src/test/suite/`.

**Run all tests:**
```powershell
npm test
```

**Run specific tests by pattern:**
Use the `--grep` option to filter tests by name or pattern:
```powershell
npm test -- --grep "pattern"
npm test -- --grep "should handle errors"
npm test -- --grep "Terminal"  # Runs all tests with "Terminal" in the name
```

**Additional options for running specific tests:**

1. **Use VS Code Testing UI** (Recommended for interactive TDD):
   - Open the Testing view (beaker icon in activity bar)
   - Navigate to specific test suites or individual tests
   - Click the play button next to any test/suite to run it
   - Right-click for debug options

2. **Focus on specific tests in code during development:**
   - Use `.only()` to run specific tests:
     ```typescript
     test.only('this test will run', () => { /* ... */ });
     suite.only('only this suite', () => { /* ... */ });
     ```
   - Use `.skip()` to exclude tests:
     ```typescript
     test.skip('this test will be skipped', () => { /* ... */ });
     ```
   - Remember to remove `.only()` before committing!

**Watch mode for continuous testing:**
```powershell
npm run watch
```
This compiles TypeScript automatically on file changes. Pair with VS Code Testing UI for efficient TDD workflow.

#### Test Organization

- **Test files**: Located in `src/test/suite/` with `.test.ts` extension
- **Test framework**: Mocha with TDD interface (`suite()`, `test()`, `setup()`, `teardown()`)
- **Assertions**: Node.js `assert` module
- **Structure**: Each test file should focus on a specific module or feature

**Example test structure:**
```typescript
suite('Feature Name', () => {
    test('should do something specific', async () => {
        // Arrange
        const input = setupTestData();

        // Act
        const result = await functionUnderTest(input);

        // Assert
        assert.strictEqual(result, expectedValue);
    });
});
```

### Troubleshooting and Debugging

**For simple issues:**
- Create test cases to reproduce the issue
- Run tests to verify the problem
- Fix the code and validate with tests

**For complex issues that are hard to reproduce with test cases:**
Add temporary debug logging that can be copy-pasted back for analysis:
```typescript
console.log('DEBUG: variableName:', JSON.stringify(variableName, null, 2));
console.log('DEBUG: functionName called with:', { param1, param2 });
```
This helps capture runtime state for scenarios that are difficult to debug otherwise.
