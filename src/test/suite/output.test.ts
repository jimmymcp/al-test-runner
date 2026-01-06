import * as assert from 'assert';
import { getOutputWriter } from '../../output';
import { OutputType } from '../../types';

suite('Output Warning System Tests', () => {

    suite('OutputWriter - Channel', () => {
        let writer = getOutputWriter(OutputType.Channel);

        setup(() => {
            writer = getOutputWriter(OutputType.Channel);
            writer.clear();
        });

        test('should start with empty content and no warnings', () => {
            assert.strictEqual(writer.content, '');
            assert.strictEqual(writer.hasContent, false);
            assert.ok(Array.isArray(writer.warnings));
            assert.strictEqual(writer.warnings.length, 0);
        });

        test('should track hasContent after writing', () => {
            assert.strictEqual(writer.hasContent, false);

            writer.write('Test line');

            assert.strictEqual(writer.hasContent, true);
        });

        test('should accumulate warnings without displaying immediately', () => {
            writer.writeError('Warning 1');
            writer.writeError('Warning 2');

            assert.strictEqual(writer.warnings.length, 2);
            assert.ok(writer.warnings.includes('Warning 1'));
            assert.ok(writer.warnings.includes('Warning 2'));
        });

        test('should clear warnings when cleared', () => {
            writer.writeError('Warning 1');
            writer.write('Content');

            assert.strictEqual(writer.warnings.length, 1);
            assert.strictEqual(writer.hasContent, true);

            writer.clear();

            assert.strictEqual(writer.warnings.length, 0);
            assert.strictEqual(writer.hasContent, false);
        });

        test('should flush warnings to output', () => {
            writer.writeError('Warning 1');
            writer.writeError('Warning 2');

            writer.flushWarnings();

            // After flushing, warnings should be cleared
            assert.strictEqual(writer.warnings.length, 0);

            // Content should now be present (warnings were written)
            assert.strictEqual(writer.hasContent, true);
        });

        test('should handle flushWarnings with no warnings', () => {
            writer.write('Some content');

            // Flushing with no warnings should not cause errors
            writer.flushWarnings();

            assert.strictEqual(writer.warnings.length, 0);
            assert.strictEqual(writer.hasContent, true);
        });

        test('should handle multiple write calls', () => {
            writer.write('Line 1');
            writer.write('Line 2');
            writer.write('Line 3');

            assert.strictEqual(writer.hasContent, true);
        });

        test('should handle writeError without throwing', () => {
            assert.doesNotThrow(() => {
                writer.writeError('Error message 1');
                writer.writeError('Error message 2');
            });

            assert.strictEqual(writer.warnings.length, 2);
        });

        test('should handle empty warning messages', () => {
            writer.writeError('');

            assert.strictEqual(writer.warnings.length, 1);
            assert.strictEqual(writer.warnings[0], '');
        });

        test('should preserve warning order', () => {
            writer.writeError('First');
            writer.writeError('Second');
            writer.writeError('Third');

            assert.strictEqual(writer.warnings[0], 'First');
            assert.strictEqual(writer.warnings[1], 'Second');
            assert.strictEqual(writer.warnings[2], 'Third');
        });
    });

    suite('OutputWriter - Editor', () => {
        let writer = getOutputWriter(OutputType.Editor);

        setup(() => {
            writer = getOutputWriter(OutputType.Editor);
            writer.clear();
        });

        test('should start with empty content and no warnings', () => {
            assert.strictEqual(writer.content, '');
            assert.strictEqual(writer.hasContent, false);
            assert.ok(Array.isArray(writer.warnings));
            assert.strictEqual(writer.warnings.length, 0);
        });

        test('should accumulate content with newlines', () => {
            writer.write('Line 1');
            writer.write('Line 2');

            // Editor writer accumulates content
            assert.ok(writer.content.includes('Line 1'));
            assert.ok(writer.content.includes('Line 2'));
            assert.strictEqual(writer.hasContent, true);
        });

        test('should track warnings separately from content', () => {
            writer.write('Normal content');
            writer.writeError('Warning message');

            assert.strictEqual(writer.hasContent, true);
            assert.strictEqual(writer.warnings.length, 1);
            assert.strictEqual(writer.warnings[0], 'Warning message');
        });

        test('should flush warnings to content', () => {
            writer.writeError('Warning 1');
            writer.writeError('Warning 2');

            const contentBefore = writer.content;
            writer.flushWarnings();

            // After flushing, content should include warnings
            assert.ok(writer.content.length > contentBefore.length);
            assert.strictEqual(writer.warnings.length, 0);
        });

        test('should clear both content and warnings', () => {
            writer.write('Content');
            writer.writeError('Warning');

            assert.strictEqual(writer.hasContent, true);
            assert.strictEqual(writer.warnings.length, 1);

            writer.clear();

            assert.strictEqual(writer.content, '');
            assert.strictEqual(writer.hasContent, false);
            assert.strictEqual(writer.warnings.length, 0);
        });

        test('should handle multiple warnings before flush', () => {
            writer.writeError('Warning 1');
            writer.writeError('Warning 2');
            writer.writeError('Warning 3');

            assert.strictEqual(writer.warnings.length, 3);

            writer.flushWarnings();

            assert.strictEqual(writer.warnings.length, 0);
            assert.strictEqual(writer.hasContent, true);
        });
    });

    suite('Warning Display Format', () => {
        test('should format warnings with visual indicators', () => {
            const writer = getOutputWriter(OutputType.Editor);

            writer.writeError('Test warning');
            writer.flushWarnings();

            // Warnings should have visual formatting
            assert.ok(writer.content.includes('⚠️') || writer.content.includes('Warning'));
        });

        test('should separate warnings from regular content', () => {
            const writer = getOutputWriter(OutputType.Editor);

            writer.write('Regular content');
            writer.writeError('Warning message');
            writer.flushWarnings();

            const content = writer.content;

            // Should have both regular content and warning
            assert.ok(content.includes('Regular content'));
            assert.ok(content.includes('Warning') || content.includes('⚠️'));
        });

        test('should handle long warning messages', () => {
            const writer = getOutputWriter(OutputType.Editor);

            const longMessage = 'This is a very long warning message that contains a lot of text and should be handled properly without truncation or errors. '.repeat(5);

            writer.writeError(longMessage);

            assert.strictEqual(writer.warnings.length, 1);
            assert.strictEqual(writer.warnings[0], longMessage);
        });
    });

    suite('Output Type Selection', () => {
        test('should return Channel writer for Channel type', () => {
            const writer = getOutputWriter(OutputType.Channel);

            // Both should have the same interface
            assert.ok(typeof writer.write === 'function');
            assert.ok(typeof writer.writeError === 'function');
            assert.ok(typeof writer.flushWarnings === 'function');
            assert.ok(typeof writer.clear === 'function');
        });

        test('should return Editor writer for Editor type', () => {
            const writer = getOutputWriter(OutputType.Editor);

            assert.ok(typeof writer.write === 'function');
            assert.ok(typeof writer.writeError === 'function');
            assert.ok(typeof writer.flushWarnings === 'function');
            assert.ok(typeof writer.clear === 'function');
        });

        test('should provide content property', () => {
            const channelWriter = getOutputWriter(OutputType.Channel);
            const editorWriter = getOutputWriter(OutputType.Editor);

            assert.ok('content' in channelWriter);
            assert.ok('content' in editorWriter);
        });

        test('should provide hasContent property', () => {
            const channelWriter = getOutputWriter(OutputType.Channel);
            const editorWriter = getOutputWriter(OutputType.Editor);

            assert.ok('hasContent' in channelWriter);
            assert.ok('hasContent' in editorWriter);
        });

        test('should provide warnings array', () => {
            const channelWriter = getOutputWriter(OutputType.Channel);
            const editorWriter = getOutputWriter(OutputType.Editor);

            assert.ok(Array.isArray(channelWriter.warnings));
            assert.ok(Array.isArray(editorWriter.warnings));
        });
    });
});
