import { outputChannel } from "./extension";
import * as vscode from 'vscode';
import { OutputType } from "./types";

export function getOutputWriter(outputType: OutputType): OutputWriter {
    switch (outputType) {
        case OutputType.Editor:
            return new OutputEditor;
        default:
            return new OutputChannel;
    }
}

export interface OutputWriter {
    content: string;
    write(contentLine: string): void;
    clear(): void;
    show(): void;
}

class OutputChannel implements OutputWriter {
    content: string = "";

    write(contentLine: string) {
        outputChannel.appendLine(contentLine);
    }

    clear() {
        outputChannel.clear();
    }

    show() {
        outputChannel.show(true);
    }
}

class OutputEditor implements OutputWriter {
    content: string = "";
    document?: vscode.TextDocument;

    write(contentLine: string) {
        this.content += contentLine + "\n";
    }

    clear() {
        this.content = "";
    }

    async show() {
        this.document = await vscode.workspace.openTextDocument({ content: this.content });
        vscode.window.showTextDocument(this.document);
    }
}

export function writeTable(writer: OutputWriter, contentArray: any[], properties: string[], clearFirst: boolean, showHeadings: boolean, title?: string, headings?: string[]): void {
    if (clearFirst) {
        writer.clear();
    }
    else {
        writer.write(' ');
    }

    if (title) {
        writer.write(title);
        writer.write(' ');
    }

    let maxLengths: number[] = getMaxColumnLengths(contentArray, properties);
    if (showHeadings) {
        let headingLine: string = '';
        properties.forEach((property, index) => {
            if (headingLine !== '') {
                headingLine += ' | ';
            }
            if (headings) {
                headingLine += padString(headings[index], maxLengths[index]);
            }
            else {
                headingLine += padString(property, maxLengths[index]);
            }
        });

        writer.write(headingLine);
        writer.write(padString('', headingLine.length, '-'));
    }

    contentArray.forEach(content => {
        let line: string = '';
        properties.forEach((property, index) => {
            if (line !== '') {
                line += ' | ';
            }
            line += padString(content[property], maxLengths[index]);
        });
        writer.write(line);
    });
}

export function padString(string: string, length: number, padWith: string = ' '): string {
    let result = string;
    for (let i = result.length; i < length; i++) {
        result += padWith;
    }
    return result;
}

function getMaxColumnLengths(contentArray: any[], properties?: string[], headings?: string[]): number[] {
    let maxLengths: number[] = [];
    properties?.forEach((property, index) => {
        if (headings) {
            maxLengths.push(getMaxLengthOfPropertyFromArray(contentArray, property, headings[index]))
        }
        else {
            maxLengths.push(getMaxLengthOfPropertyFromArray(contentArray, property));
        }
    });
    return maxLengths;
}

export function getMaxLengthOfPropertyFromArray(contentArray: any[], property?: string, heading?: string): number {
    let maxLength: number = 0;
    contentArray.forEach(element => {
        let propertyValue: string;
        if (property) {
            if (typeof (element[property]) == "string") {
                propertyValue = element[property];
            }
            else {
                propertyValue = element[property].toString();
            }
        }
        else {
            propertyValue = element;
        }
        if (propertyValue.length > maxLength) {
            maxLength = propertyValue.length
        }
    });

    if (property) {
        if (property.length > maxLength) {
            maxLength = property.length;
        }
    }

    if (heading) {
        if (heading.length > maxLength) {
            maxLength = heading.length;
        }
    }

    return maxLength;
}