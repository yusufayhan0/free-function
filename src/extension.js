const vscode = require('vscode');

function activate(context) {
    const provider = vscode.languages.registerCompletionItemProvider(['javascript', 'javascriptreact', 'typescript', 'typescriptreact'], {
        provideCompletionItems(document, position) {
            // İmlecin bulunduğu satırı al
            const linePrefix = document.lineAt(position).text.substr(0, position.character);
            
            // Regex ile fonksiyon çağrısı pattern'ini kontrol et
            // const functionCallPattern = /\b(\w+)\(([^)]*)\)\s$/;
            const functionCallPattern = /\b(\w+)\s*\(\s*([\s\S]*?)\s*\)/;
            const match = linePrefix.match(functionCallPattern);
            
            if (!match) {
                return undefined;
            }
            
            const completionItem = new vscode.CompletionItem('Create Function', vscode.CompletionItemKind.Snippet);
            completionItem.insertText = '';
            match.shift()

            // Kullanıcı bu öneriyi seçtiğinde, komutu tetikle
            completionItem.command = { command: 'extension.createFunction', title: 'Create Function', arguments: [...match] };
            return [completionItem];
        },
    }, ' '); // Boşluk karakteri üzerinde tetiklenir

    context.subscriptions.push(provider);

    // Komutu kaydet
    const command = vscode.commands.registerCommand('extension.createFunction', (funcName, paramsText) => {
        
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }
        
        const params = paramsText.split(',')
        .map((param, index) => {
          return (
            param.includes('\'') || 
            param.includes('"') ||
            param.includes('`')
          ) 
          ? `arg${(index + 1)}` 
          : param.trim()
        })

        const document = editor.document;
        const position = editor.selection.active; // İmlecin aktif pozisyonu
        let line = position.line;

        // İmleçten yukarı doğru giderek en yakın component tanımını bul
        const componentPattern = /(?:const|let|var|function)\s+\w+\s*=\s*\(|\bfunction\b\s+\w+\s*\(|(?:const|let|var)\s+\w+\s*:\s*React\.FC\s*<.*>\s*=\s*\(/gm;
        let componentStart = -1;
        for (; line >= 0; line--) {
            const lineText = document.lineAt(line).text;
            if (lineText.match(componentPattern)) {
                componentStart = line;
                break;
            }
        }

        if (componentStart === -1) {
            vscode.window.showErrorMessage('No component found');
            return;
        }

        // Component tanımından itibaren 'return' ifadesini bul
        const returnRegex = /return\s*\(/;
        let returnPosition = null;
        let functionPosition = null;
        for (; line < document.lineCount; line++) {
            const lineText = document.lineAt(line).text;
            
            if (lineText.match(returnRegex)) {
                returnPosition = new vscode.Position(line - 1, 0);
                functionPosition = new vscode.Position(line - 2, 0);
                break;
            }
        }

        if (!returnPosition) {
            vscode.window.showErrorMessage('No return statement found in the component');
            return;
        }

        const snippet = `\tfunction ${funcName}(${params.join(',')}) {\n\t\t// Your code here\n\t}\n`;

        editor.edit(editBuilder => {
            editBuilder.insert(returnPosition, snippet);
            editor.selection = new vscode.Selection(functionPosition, functionPosition);
            editor.revealRange(new vscode.Range(functionPosition, functionPosition));
        });
    });

    context.subscriptions.push(command);
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};
