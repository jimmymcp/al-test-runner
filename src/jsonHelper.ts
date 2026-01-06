/**
 * Helper functions for parsing JSON files, with support for comments
 */

/**
 * Parses JSON string with support for line and block comments
 * @param jsonString The JSON string to parse
 * @returns Parsed JSON object
 */
export function parseJsonWithComments(jsonString: string): any {
    // Remove comments while preserving strings
    let cleaned = removeJsonComments(jsonString);

    return JSON.parse(cleaned);
}

/**
 * Removes comments from JSON string while preserving string literals
 * @param jsonString The JSON string with potential comments
 * @returns JSON string without comments
 */
function removeJsonComments(jsonString: string): string {
    let result = '';
    let inString = false;
    let inSingleLineComment = false;
    let inMultiLineComment = false;
    let escapeNext = false;

    for (let i = 0; i < jsonString.length; i++) {
        const char = jsonString[i];
        const nextChar = jsonString[i + 1];

        // Handle escape sequences in strings
        if (escapeNext) {
            if (inString) {
                result += char;
            }
            escapeNext = false;
            continue;
        }

        if (char === '\\' && inString) {
            result += char;
            escapeNext = true;
            continue;
        }

        // Handle string boundaries
        if (char === '"' && !inSingleLineComment && !inMultiLineComment) {
            inString = !inString;
            result += char;
            continue;
        }

        // Skip everything if we're in a string
        if (inString) {
            result += char;
            continue;
        }

        // Handle multi-line comment end
        if (inMultiLineComment) {
            if (char === '*' && nextChar === '/') {
                inMultiLineComment = false;
                i++; // Skip the '/'
            }
            continue;
        }

        // Handle single-line comment end
        if (inSingleLineComment) {
            if (char === '\n' || char === '\r') {
                inSingleLineComment = false;
                result += char; // Preserve the newline
            }
            continue;
        }

        // Check for comment start
        if (char === '/') {
            if (nextChar === '/') {
                inSingleLineComment = true;
                i++; // Skip the second '/'
                continue;
            }
            if (nextChar === '*') {
                inMultiLineComment = true;
                i++; // Skip the '*'
                continue;
            }
        }

        // Normal character outside of comments
        result += char;
    }

    return result;
}

/**
 * Safely parses JSON string with error handling
 * @param jsonString The JSON string to parse
 * @param filePath Optional file path for better error messages
 * @returns Parsed JSON object or null if parsing fails
 */
export function safeParseJson(jsonString: string, filePath?: string): any | null {
    try {
        // Remove BOM if present
        const cleaned = jsonString.charCodeAt(0) === 0xfeff ? jsonString.slice(1) : jsonString;
        return parseJsonWithComments(cleaned);
    } catch (error) {
        const fileInfo = filePath ? ` in ${filePath}` : '';
        console.error(`Failed to parse JSON${fileInfo}:`, error);
        return null;
    }
}
