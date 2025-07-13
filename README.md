# AST Analysis Tool

A powerful tool for analyzing JavaScript and TypeScript codebases using the `oxc-parser` package. This tool recursively scans directories, parses all JS/TS files, and provides comprehensive statistics about AST node types and usage patterns.

## Features

- 🔍 **Multi-format Support**: Analyzes `.js`, `.jsx`, `.ts`, `.tsx`, `.mjs`, and `.cjs` files
- 🌳 **Complete AST Analysis**: Counts all AST node types with detailed statistics
- 📊 **Comprehensive Reporting**: Provides file counts, node counts, averages, and percentages
- ⚡ **Fast Processing**: Efficient parsing with progress indicators
- 🛡️ **Error Handling**: Gracefully handles parse errors and reports failed files
- 🎯 **Smart Filtering**: Automatically excludes common build/dependency directories

## Installation

```bash
npm install
```

## Usage

### Basic Usage

```bash
npm run analyze <directory>
```

### Examples

```bash
# Analyze the current directory
npm run analyze .

# Analyze a specific source directory
npm run analyze ./src

# Analyze a project directory
npm run analyze /path/to/your/project
```

## Output

The tool provides several types of analysis:

### File Statistics
- Total files found and successfully parsed
- Failed parse attempts with error details
- Total file size and average file size

### Node Statistics
- Total number of AST nodes across all files
- Average number of nodes per file
- Breakdown by node type with counts and percentages

### Top Node Types
Shows the 15 most common AST node types in your codebase

### Complete Node Type List
Comprehensive list of all node types found, sorted by frequency

## Example Output

```
🔍 Analyzing JavaScript/TypeScript files in: ./src

📁 Found 25 files to analyze...

📊 Analyzing... 25/25 (100%)

============================================================
📊 AST ANALYSIS RESULTS
============================================================

📁 FILE STATISTICS:
   Total files found: 25
   Successfully parsed: 24
   Failed to parse: 1
   Total file size: 156.7 KB

🌳 NODE STATISTICS:
   Total nodes: 12,547
   Average nodes per file: 523
   Average file size: 6.5 KB

🏆 TOP NODE TYPES:
    1.  Identifier                    2,341 (18.7%)
    2.  MemberExpression             1,156 (9.2%)
    3.  CallExpression                 892 (7.1%)
    4.  Property                       654 (5.2%)
    5.  BinaryExpression               543 (4.3%)
    ...
```

## Node Types

The tool recognizes all standard ECMAScript AST node types, including:

- **Declarations**: `FunctionDeclaration`, `VariableDeclaration`, `ClassDeclaration`
- **Expressions**: `CallExpression`, `MemberExpression`, `BinaryExpression`, `ArrowFunctionExpression`
- **Statements**: `IfStatement`, `ForStatement`, `WhileStatement`, `ReturnStatement`
- **Literals**: `StringLiteral`, `NumericLiteral`, `BooleanLiteral`
- **TypeScript specific**: `TSTypeAnnotation`, `TSInterfaceDeclaration`, `TSTypeReference`
- **JSX specific**: `JSXElement`, `JSXAttribute`, `JSXText`

## Excluded Directories

The tool automatically excludes common directories that typically don't contain source code:

- `node_modules/`
- `dist/`
- `build/`
- `.git/`
- `coverage/`
- Minified files (`*.min.js`, `*.bundle.js`)

## Error Handling

- **Parse Errors**: Files with syntax errors are reported but don't stop the analysis
- **File Access**: Inaccessible files are skipped gracefully
- **Type Safety**: Full TypeScript support with proper type checking

## Technical Details

- **Parser**: Uses `oxc-parser`, a fast and accurate JavaScript/TypeScript parser written in Rust
- **Performance**: Optimized for large codebases with efficient memory usage
- **Accuracy**: Handles modern JavaScript features, JSX, and TypeScript syntax

## Contributing

Feel free to submit issues and enhancement requests!

## License

MIT
