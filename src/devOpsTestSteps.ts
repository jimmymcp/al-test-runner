import * as vscode from 'vscode';
import { DevOpsTestStep } from './types';

export async function exportTestItemsToCsv(testItem: vscode.TestItem) {
    const testSteps = await getDevOpsTestStepsForTestItems(testItem);
    const csv = convertTestStepsToCsv(testSteps);
    saveCsvToFile(csv, testItem.label);
}

export async function getDevOpsTestStepsForTestItems(testItem: vscode.TestItem): Promise<DevOpsTestStep[]> {
    return new Promise(async resolve => {
        if (testItem == undefined) {
            resolve([]);
            return;
        }
        
        let testSteps: DevOpsTestStep[] = [];

        if (testItem.children.size > 0) {
            let children: vscode.TestItem[] = [];
            testItem.children.forEach(child => {
                children.push(child);
            });

            // for...of loop forces the code to wait for the promise to resolve before continuing
            for(let child of children) {
                const childTestSteps = await getDevOpsTestStepsForTestItems(child);
                testSteps = testSteps.concat(childTestSteps);
            }

            resolve(testSteps);
            return;
        }

        testSteps.push({
            ID: '',
            "Work Item Type": 'Test Case',
            Title: pasalCaseToSentenceCase(testItem.label),
            "Test Step": '',
            "Step Action": '',
            "Step Expected": '',
        });
        let testStepNumber: number = 0;
        const commentLines = await getCommentLinesForTestItem(testItem);

        commentLines.forEach(commentLine => {
            testStepNumber++;
            if (commentLine.startsWith('//[GIVEN]') || commentLine.startsWith('//[WHEN]')) {
                const lineType = capitaliseFirstCharacter(commentLine.substring(3, commentLine.indexOf(']')).toLowerCase());
                const stepAction = `${lineType} ${commentLine.substring(commentLine.indexOf(']') + 1).trim()}`;
                testSteps.push({
                    ID: '',
                    "Work Item Type": '',
                    Title: '',
                    "Test Step": testStepNumber.toString(),
                    "Step Action": stepAction,
                    "Step Expected": '',
                });
            }
            else {
                const stepExpected = commentLine.substring(commentLine.indexOf(']') + 1).trim();
                let testStep = testSteps[testSteps.length - 1];
                if (testStep['Step Expected'] != '') {
                    testStep['Step Expected'] += '\n';
                }
                testStep['Step Expected'] += `Then ${stepExpected}`;
                testSteps[testSteps.length - 1] = testStep;
            }
        });
        resolve(testSteps);
    });
}

function capitaliseFirstCharacter(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
}

function pasalCaseToSentenceCase(pascalCase: string): string {
    return pascalCase.replace(/([A-Z])/g, ' $1').trim();
}

export async function getCommentLinesForTestItem(testItem: vscode.TestItem): Promise<string[]> {
    return new Promise(async resolve => {
        let commentLines: string[] = [];

        const testText: string[] = await getTextOfTestItem(testItem);

        //find the lines that start with '//'
        testText.forEach(line => {
            if (line.trimStart().startsWith('//')) {
                commentLines.push(line.trimStart());
            }
        });

        resolve(commentLines);
    });
}

async function getTextOfTestItem(testItem: vscode.TestItem): Promise<string[]> {
    return new Promise(resolve => {
        vscode.workspace.openTextDocument(testItem.uri!).then(async document => {
            //get a range which starts at the testitem range and ends at the end of the document
            const range = new vscode.Range(testItem.range!.start, document.lineAt(document.lineCount - 1).range.end);
            const documentText = await document.getText(range);

            //find the next occurence of "    end;"
            const regEx = /\n    end;/;
            const match = regEx.exec(documentText);
            if (match) {
                resolve(documentText.substring(0, match.index).split('\n'));
            }
            else {
                resolve([]);
            }
        });
    });
}
function convertTestStepsToCsv(testSteps: DevOpsTestStep[]): string {
    let csv = 'ID,Work Item Type,Title,Test Step,Step Action,Step Expected\n';
    testSteps.forEach(testStep => {
        csv += `"${testStep.ID}","${testStep["Work Item Type"]}","${testStep.Title}","${testStep["Test Step"]}","${testStep["Step Action"]}","${testStep["Step Expected"]}"\n`;
    });
    return csv;
}

function saveCsvToFile(csv: string, filename: string) {
    vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file(filename + '.csv'),
        filters: {
            'CSV Files': ['csv']
        }
    }).then(fileUri => {
        if (fileUri) {
            vscode.workspace.fs.writeFile(fileUri, Buffer.from(csv));
        }
    });
}
