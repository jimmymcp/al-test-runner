import { outputChannel } from "./extension";
import * as vscode from 'vscode';

export function getOutputWriter(): OutputWriter {
    let config = vscode.workspace.getConfiguration('al-test-runner');
    if (config.testOutputLocation === "Editor") {
        return new OutputEditor;
    }
    else {
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