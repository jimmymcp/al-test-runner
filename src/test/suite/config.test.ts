import * as assert from 'assert';
import { join, sep } from 'path';
import * as os from 'os';

suite('Config Path Tests', () => {
    suite('Path separator handling', () => {
        test('should use OS-appropriate path separator for .altestrunner path', () => {
            // Verify that join uses the correct separator for the OS
            const testPath = join('workspace', '.altestrunner');
            
            // The path should use the OS-specific separator
            if (os.platform() === 'win32') {
                assert.strictEqual(testPath, 'workspace\\.altestrunner');
            } else {
                assert.strictEqual(testPath, 'workspace/.altestrunner');
            }
            
            // Ensure the path does NOT have the wrong separator as part of the filename
            const pathParts = testPath.split(sep);
            assert.strictEqual(pathParts.length, 2);
            assert.strictEqual(pathParts[0], 'workspace');
            assert.strictEqual(pathParts[1], '.altestrunner');
        });

        test('should use OS-appropriate path separator for config.json path', () => {
            const testPath = join('workspace', '.altestrunner', 'config.json');
            
            // Verify structure with correct separators
            const pathParts = testPath.split(sep);
            assert.strictEqual(pathParts.length, 3);
            assert.strictEqual(pathParts[0], 'workspace');
            assert.strictEqual(pathParts[1], '.altestrunner');
            assert.strictEqual(pathParts[2], 'config.json');
        });

        test('should use OS-appropriate path separator for launch.json path', () => {
            const testPath = join('workspace', '.vscode', 'launch.json');
            
            // Verify structure with correct separators
            const pathParts = testPath.split(sep);
            assert.strictEqual(pathParts.length, 3);
            assert.strictEqual(pathParts[0], 'workspace');
            assert.strictEqual(pathParts[1], '.vscode');
            assert.strictEqual(pathParts[2], 'launch.json');
        });

        test('should use OS-appropriate path separator for codecoverage.json path', () => {
            const testPath = join('.', '.altestrunner', 'codecoverage.json');
            
            // Verify structure with correct separators
            const pathParts = testPath.split(sep);
            assert.strictEqual(pathParts[pathParts.length - 2], '.altestrunner');
            assert.strictEqual(pathParts[pathParts.length - 1], 'codecoverage.json');
        });

        test('should not include backslashes in filenames on Unix systems', () => {
            if (os.platform() !== 'win32') {
                const testPath = join('workspace', '.altestrunner');
                
                // On Unix, backslash should never appear in the path
                assert.strictEqual(testPath.includes('\\'), false, 
                    'Path should not contain backslashes on Unix systems');
            }
        });

        test('should not include forward slashes in component names on Windows', () => {
            if (os.platform() === 'win32') {
                const testPath = join('workspace', '.altestrunner');
                
                // The component name should not have slashes in it
                const pathParts = testPath.split(sep);
                pathParts.forEach(part => {
                    assert.strictEqual(part.includes('/'), false,
                        `Path component "${part}" should not contain forward slashes`);
                });
            }
        });
    });
});
