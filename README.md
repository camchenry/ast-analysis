# AST Analysis Tool

Copilot wrote basically of this code because I was feeling lazy and I just wanted to know about the frequency of AST node types in typical S codebases. This information will help inform the development in `oxc`, as we can optimize around which node types are the most common.

To install and use:

```bash
npm install
npm run analyze <directory>
```

Example output:

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

There is also a script to download some popular repositories for testing:

```bash
npm run download-repos
```