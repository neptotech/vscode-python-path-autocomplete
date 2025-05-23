import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
    const provider = vscode.languages.registerCompletionItemProvider('python', {
        provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
            console.log('provideCompletionItems called');

            const line = document.lineAt(position);
            const text = line.text.substring(0, position.character);

            const singleQuoteIndex = text.lastIndexOf("'");
            const doubleQuoteIndex = text.lastIndexOf('"');
            const quoteIndex = Math.max(singleQuoteIndex, doubleQuoteIndex);

            if (quoteIndex === -1) return;

            // Extract the path-like string from the quote to the current position
            const partialPath = text.substring(quoteIndex + 1);
            const normalizedPartialPath = partialPath.replace(/\\/g, path.sep);

            const lastSepIndex = Math.max(
                normalizedPartialPath.lastIndexOf('/'),
                normalizedPartialPath.lastIndexOf('\\')
            );
            if (lastSepIndex === -1) return;

            const baseFragment = normalizedPartialPath.substring(0, lastSepIndex + 1);
            const partial = normalizedPartialPath.substring(lastSepIndex + 1);

            const diskRoot = text[quoteIndex + 1] === '.'
                ? vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '/'
                : '/';

            const targetDir = path.resolve(diskRoot, baseFragment);

            let files: string[] = [];
            try {
                files = fs.readdirSync(targetDir);
            } catch (err) {
                console.error('Error reading directory:', targetDir, err);
                return;
            }

            return files
                .filter(file => file.startsWith(partial))
                .map(file => {
                    const fullPath = path.join(targetDir, file);
                    const isDirectory = fs.statSync(fullPath).isDirectory();
                    const item = new vscode.CompletionItem(file, isDirectory
                        ? vscode.CompletionItemKind.Folder
                        : vscode.CompletionItemKind.File);
                    item.insertText = isDirectory ? file + path.sep : file;
                    return item;
                });
        }
    }, '/', '\\'); // Trigger on both slash and backslash

    context.subscriptions.push(provider);
}

export function deactivate() {}
