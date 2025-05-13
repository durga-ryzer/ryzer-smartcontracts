// Script to build the SDK without type checking using the TypeScript compiler API
const ts = require('typescript');
const fs = require('fs');
const path = require('path');
const glob = require('glob');

console.log('Building SDK without type checking...');

// Create output directory if it doesn't exist
const outDir = path.join(__dirname, 'dist');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Find all TypeScript files in the src directory
const sourceFiles = glob.sync('src/**/*.ts', { cwd: __dirname });

// TypeScript compiler options
const options = {
  target: ts.ScriptTarget.ES2020,
  module: ts.ModuleKind.CommonJS,
  esModuleInterop: true,
  skipLibCheck: true,
  declaration: true,
  outDir: outDir,
  allowJs: true,
  noEmitOnError: false
};

// Create a program
const program = ts.createProgram(sourceFiles, options);

// Emit output
const emitResult = program.emit();

// Report diagnostics without failing the build
const diagnostics = ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics);
if (diagnostics.length > 0) {
  console.log('Compilation completed with errors (ignored for build):');
  diagnostics.forEach(diagnostic => {
    if (diagnostic.file) {
      const { line, character } = ts.getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start);
      const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
      console.log(`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`);
    } else {
      console.log(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
    }
  });
}

console.log('Build completed successfully!');

