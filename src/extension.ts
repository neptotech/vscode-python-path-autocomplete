import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
    // Register a completion provider for plaintext (or change to your desired language)
    const provider = vscode.languages.registerCompletionItemProvider('python', {
        provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
            // Get the text from the start of the line until the current position.
			console.log('provideCompletionItems called');
            const line = document.lineAt(position);
            const text = line.text.substring(0, position.character);

            // Look for the last occurrence of "/" to determine the current path fragment.
            const firstSlashIndex = text.indexOf('/');
            const lastSlashIndex = text.lastIndexOf('/');
            if (lastSlashIndex === -1) {
                return undefined;
            }
            // Check if the cursor is inside a Python string.
            const singleQuoteIndex = text.lastIndexOf("'");
            const doubleQuoteIndex = text.lastIndexOf('"');

            const quoteIndex = Math.max(singleQuoteIndex, doubleQuoteIndex);
            // If no quote is found or the last quote is not before the last slash, return undefined.
            if (quoteIndex === -1 || quoteIndex > lastSlashIndex) {
                return undefined;
            }

            const diskRoot = text[quoteIndex+1]=='.' 
                ? vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '/' 
                : '/';

            // Extract the path fragment. For example, if the text is "/folder/sub", then:
            // baseFragment = "/folder/" and partial = "sub"
            const baseFragment = text.substring(firstSlashIndex, lastSlashIndex + 1); // includes the "/"
            const partial = text.substring(lastSlashIndex + 1);

            // Make sure the path starts with "/" to interpret it as relative to the workspace root.
            if (!baseFragment.startsWith('/')) {
                return undefined;
            }



            // Resolve the target directory by joining the workspace root and the baseFragment.
            // Remove the leading "/" from baseFragment to prevent an absolute path override.
            const relativeDir = baseFragment.substring(1);
            const targetDir = path.join(diskRoot, relativeDir);

            // Try reading the directory.
            let files: string[] = [];
            try {
                files = fs.readdirSync(targetDir);
            } catch (err) {
                console.error('Error reading directory:', targetDir, err);
                return undefined;
            }

            // Create completion items for files/folders that start with the partial.
            const completionItems = files
                .filter(fileName => fileName.startsWith(partial))
                .map(fileName => {
                    const fullPath = path.join(targetDir, fileName);
                    const isDirectory = fs.statSync(fullPath).isDirectory();
                    const item = new vscode.CompletionItem(fileName, isDirectory
                        ? vscode.CompletionItemKind.Folder
                        : vscode.CompletionItemKind.File);
                    // If the item is a directory, append "/" so that additional completions can be triggered.
                    item.insertText = fileName
                    return item;
                });

            return completionItems;
        }
    }, '/');  // Trigger the provider when "ROOT" is typed

    context.subscriptions.push(provider);
}

export function deactivate() {}

