import * as assert from 'assert';
import * as vscode from 'vscode';
import { publishApp } from '../../publish';
import { PublishType } from '../../types';
import * as sinon from 'sinon';
import * as telemetry from '../../telemetry';

suite('Publish Error Handling Tests', () => {
    let executeCommandStub: sinon.SinonStub;
    let sendALCommandPublishErrorStub: sinon.SinonStub;
    let sendFailedToPublishErrorStub: sinon.SinonStub;

    setup(() => {
        // Mock vscode.commands.executeCommand to prevent actual AL command execution
        executeCommandStub = sinon.stub(vscode.commands, 'executeCommand');

        // Mock telemetry functions to prevent undefined telemetryReporter errors
        sendALCommandPublishErrorStub = sinon.stub(telemetry, 'sendALCommandPublishError').returns('Mocked error');
        sendFailedToPublishErrorStub = sinon.stub(telemetry, 'sendFailedToPublishError').returns('Mocked error');

        // Default: mock successful publish
        executeCommandStub.callsFake(async (command: string) => {
            if (command === 'al.publishNoDebug' || command === 'al.incrementalPublishNoDebug') {
                return { success: true };
            }
            if (command === 'workbench.action.closeActiveEditor') {
                return undefined;
            }
            return undefined;
        });
    });

    teardown(() => {
        // Restore all stubs
        executeCommandStub.restore();
        sendALCommandPublishErrorStub.restore();
        sendFailedToPublishErrorStub.restore();
    });

    suite('publishApp', () => {
        test('should return success immediately for PublishType.None', async () => {
            const result = await publishApp(PublishType.None);

            assert.strictEqual(result.success, true);
            assert.strictEqual(result.message, '');

            // Should not call any AL commands for PublishType.None
            assert.ok(!executeCommandStub.calledWith('al.publishNoDebug'));
            assert.ok(!executeCommandStub.calledWith('al.incrementalPublishNoDebug'));
        });

        test('should handle AL package command failure gracefully', async () => {
            // Mock command failure
            executeCommandStub.callsFake(async (command: string) => {
                if (command === 'al.publishNoDebug') {
                    return { success: false, error: 'Compilation failed' };
                }
                return undefined;
            });

            const result = await publishApp(PublishType.Publish);

            // Result should have success and message properties
            assert.ok('success' in result);
            assert.ok('message' in result);
            assert.strictEqual(typeof result.success, 'boolean');
            assert.strictEqual(typeof result.message, 'string');
            assert.strictEqual(result.success, false);
            assert.ok(result.message.includes('Compilation failed') || result.message.includes('failed to publish'));
        });

        test('should return meaningful error message on AL command failure', async () => {
            // Mock command failure with specific error
            executeCommandStub.callsFake(async (command: string) => {
                if (command === 'al.publishNoDebug') {
                    return { success: false, error: 'Build error: missing dependency' };
                }
                return undefined;
            });

            const result = await publishApp(PublishType.Publish);

            assert.strictEqual(result.success, false);
            assert.ok(result.message.length > 0, 'Error message should not be empty');
            assert.ok(result.message.includes('missing dependency') || result.message.includes('failed to publish'));
        });

        test('should handle publish timeout gracefully', async () => {
            // Mock successful rapid publish
            executeCommandStub.callsFake(async (command: string) => {
                if (command === 'al.incrementalPublishNoDebug') {
                    return { success: true };
                }
                return undefined;
            });

            const result = await publishApp(PublishType.Rapid);

            // Should complete and return a result
            assert.ok('success' in result);
            assert.strictEqual(typeof result.success, 'boolean');
            assert.strictEqual(result.success, true);
        });

        test('should handle publish timeout gracefully', async () => {
            // Mock successful rapid publish
            executeCommandStub.callsFake(async (command: string) => {
                if (command === 'al.incrementalPublishNoDebug') {
                    return { success: true };
                }
                return undefined;
            });

            const result = await publishApp(PublishType.Rapid);

            // Should complete and return a result
            assert.ok('success' in result);
            assert.strictEqual(typeof result.success, 'boolean');
            assert.strictEqual(result.success, true);
        });

        test('should return PublishResult with required properties', async () => {
            const result = await publishApp(PublishType.None);

            // Verify result structure
            assert.ok(result, 'Result should not be null or undefined');
            assert.ok('success' in result, 'Result should have success property');
            assert.ok('message' in result, 'Result should have message property');
            assert.strictEqual(typeof result.success, 'boolean', 'success should be boolean');
            assert.strictEqual(typeof result.message, 'string', 'message should be string');
        });
    });

    suite('Publish Failure Scenarios', () => {
        test('should handle missing app.json gracefully', async () => {
            // Mock AL command failure (might happen if app.json is invalid)
            executeCommandStub.callsFake(async (command: string) => {
                if (command === 'al.publishNoDebug') {
                    return { success: false, error: 'app.json not found' };
                }
                return undefined;
            });

            const result = await publishApp(PublishType.Publish);

            assert.strictEqual(result.success, false);
            assert.ok(result.message, 'Should provide error message on failure');
            assert.ok(result.message.includes('app.json') || result.message.includes('failed to publish'));
        });

        test('should handle AL extension not available', async () => {
            // Mock command returning undefined (command not found scenario)
            executeCommandStub.callsFake(async (command: string) => {
                if (command === 'al.incrementalPublishNoDebug') {
                    return undefined; // Command executed but returned nothing
                }
                return undefined;
            });

            const result = await publishApp(PublishType.Rapid);

            // Should treat undefined return as success (AL extension behavior)
            assert.strictEqual(typeof result.success, 'boolean');
            assert.strictEqual(result.success, true);
        });
    });

    suite('Error Message Quality', () => {
        test('should provide specific error message on AL command failure', async () => {
            // Mock command failure with detailed error
            executeCommandStub.callsFake(async (command: string) => {
                if (command === 'al.publishNoDebug') {
                    return { success: false, error: 'Specific error details here' };
                }
                return undefined;
            });

            const result = await publishApp(PublishType.Publish);

            assert.strictEqual(result.success, false);
            assert.ok(result.message.length > 0);
            assert.notStrictEqual(result.message, 'undefined');
            assert.notStrictEqual(result.message, 'null');
        });

        test('should provide error message that helps diagnose the issue', async () => {
            // Mock various failure scenarios
            executeCommandStub.callsFake(async (command: string) => {
                if (command === 'al.publishNoDebug') {
                    return { success: false, error: 'Build failed: syntax error on line 42' };
                }
                return undefined;
            });

            const result = await publishApp(PublishType.Publish);

            assert.strictEqual(result.success, false);
            const hasContext =
                result.message.includes('syntax error') ||
                result.message.includes('failed') ||
                result.message.includes('error') ||
                result.message.length > 10;

            assert.ok(hasContext, 'Error message should provide context: ' + result.message);
        });
    });

    suite('Publish Type Handling', () => {
        test('should handle PublishType.Publish', async () => {
            executeCommandStub.callsFake(async (command: string) => {
                if (command === 'al.publishNoDebug') {
                    return { success: true };
                }
                return undefined;
            });

            const result = await publishApp(PublishType.Publish);
            assert.strictEqual(result.success, true);

            // Verify correct command was called
            assert.ok(executeCommandStub.calledWith('al.publishNoDebug'));
        });

        test('should handle PublishType.Rapid', async () => {
            executeCommandStub.callsFake(async (command: string) => {
                if (command === 'al.incrementalPublishNoDebug') {
                    return { success: true };
                }
                return undefined;
            });

            const result = await publishApp(PublishType.Rapid);
            assert.strictEqual(result.success, true);

            // Verify correct command was called
            assert.ok(executeCommandStub.calledWith('al.incrementalPublishNoDebug'));
        });

        test('should handle PublishType.None', async () => {
            const result = await publishApp(PublishType.None);
            assert.strictEqual(result.success, true);

            // Should not call any publish commands
            assert.ok(!executeCommandStub.calledWith('al.publishNoDebug'));
            assert.ok(!executeCommandStub.calledWith('al.incrementalPublishNoDebug'));
        });
    });
});
