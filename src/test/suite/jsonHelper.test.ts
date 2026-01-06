import * as assert from 'assert';
import { parseJsonWithComments, safeParseJson } from '../../jsonHelper';

suite('JSON Helper Tests', () => {
    suite('parseJsonWithComments', () => {
        test('should parse valid JSON without comments', () => {
            const json = '{"name": "test", "value": 123}';
            const result = parseJsonWithComments(json);
            assert.strictEqual(result.name, 'test');
            assert.strictEqual(result.value, 123);
        });

        test('should remove single-line comments', () => {
            const json = `{
                // This is a comment
                "name": "test", // inline comment
                "value": 123
            }`;
            const result = parseJsonWithComments(json);
            assert.strictEqual(result.name, 'test');
            assert.strictEqual(result.value, 123);
        });

        test('should remove block comments', () => {
            const json = `{
                /* This is a
                   multi-line comment */
                "name": "test",
                "value": 123 /* inline block comment */
            }`;
            const result = parseJsonWithComments(json);
            assert.strictEqual(result.name, 'test');
            assert.strictEqual(result.value, 123);
        });

        test('should preserve // in string values', () => {
            const json = '{"url": "http://example.com", "comment": "This // is not a comment"}';
            const result = parseJsonWithComments(json);
            assert.strictEqual(result.url, 'http://example.com');
            assert.strictEqual(result.comment, 'This // is not a comment');
        });

        test('should preserve /* */ in string values', () => {
            const json = '{"text": "This /* is */ not a comment"}';
            const result = parseJsonWithComments(json);
            assert.strictEqual(result.text, 'This /* is */ not a comment');
        });

        test('should handle Windows file paths with backslashes', () => {
            const json = '{"path": "C:\\\\Users\\\\test\\\\file.json"}';
            const result = parseJsonWithComments(json);
            assert.strictEqual(result.path, 'C:\\Users\\test\\file.json');
        });

        test('should handle escaped quotes in strings', () => {
            const json = '{"quote": "She said \\"Hello\\""}';
            const result = parseJsonWithComments(json);
            assert.strictEqual(result.quote, 'She said "Hello"');
        });

        test('should handle mixed comments and special characters in strings', () => {
            const json = `{
                // Comment before
                "path": "C:\\\\Program Files\\\\App", // Path with backslashes
                "url": "http://example.com", /* URL comment */
                // Another comment
                "message": "Use // for comments"
            }`;
            const result = parseJsonWithComments(json);
            assert.strictEqual(result.path, 'C:\\Program Files\\App');
            assert.strictEqual(result.url, 'http://example.com');
            assert.strictEqual(result.message, 'Use // for comments');
        });

        test('should handle nested JSON with comments', () => {
            const json = `{
                // Top level comment
                "outer": {
                    /* Nested comment */
                    "inner": "value"
                }
            }`;
            const result = parseJsonWithComments(json);
            assert.strictEqual(result.outer.inner, 'value');
        });

        test('should handle arrays with comments', () => {
            const json = `{
                "items": [
                    // First item
                    "item1",
                    "item2", // Second item
                    /* Third item */ "item3"
                ]
            }`;
            const result = parseJsonWithComments(json);
            assert.strictEqual(result.items.length, 3);
            assert.strictEqual(result.items[0], 'item1');
            assert.strictEqual(result.items[2], 'item3');
        });
    });

    suite('safeParseJson', () => {
        test('should parse valid JSON and return object', () => {
            const json = '{"name": "test"}';
            const result = safeParseJson(json);
            assert.notStrictEqual(result, null);
            assert.strictEqual(result.name, 'test');
        });

        test('should handle BOM and parse correctly', () => {
            const jsonWithBOM = '\ufeff{"name": "test", "value": 123}';
            const result = safeParseJson(jsonWithBOM);
            assert.notStrictEqual(result, null);
            assert.strictEqual(result.name, 'test');
            assert.strictEqual(result.value, 123);
        });

        test('should handle BOM with comments', () => {
            const jsonWithBOM = '\ufeff{"name": "test", /* comment */ "value": 123}';
            const result = safeParseJson(jsonWithBOM);
            assert.notStrictEqual(result, null);
            assert.strictEqual(result.name, 'test');
            assert.strictEqual(result.value, 123);
        });

        test('should return null for invalid JSON', () => {
            const invalidJson = '{"name": "test"'; // Missing closing brace
            const result = safeParseJson(invalidJson);
            assert.strictEqual(result, null);
        });

        test('should return null for invalid JSON after comment removal', () => {
            const invalidJson = '{"name": // missing value\n}';
            const result = safeParseJson(invalidJson);
            assert.strictEqual(result, null);
        });

        test('should handle empty string', () => {
            const result = safeParseJson('');
            assert.strictEqual(result, null);
        });

        test('should preserve complex paths with comments', () => {
            const json = `{
                // Config file path
                "codeCoveragePath": ".//.altestrunner//codecoverage.json",
                "testPath": "C:\\\\Users\\\\Test\\\\Documents" // Windows path
            }`;
            const result = safeParseJson(json);
            assert.notStrictEqual(result, null);
            assert.strictEqual(result.codeCoveragePath, './/.altestrunner//codecoverage.json');
            assert.strictEqual(result.testPath, 'C:\\Users\\Test\\Documents');
        });
    });
});
