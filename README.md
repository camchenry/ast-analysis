# AST Analysis Tool

Copilot wrote basically of this code because I was feeling lazy and I just wanted to know about the frequency of AST node types in typical JS codebases. There is nothing special about this code really, it's just a quick analysis on node frequencies. This information will help inform the development in `oxc`, as we can optimize around which node types are the most common.

If just want to see the results, look at `analysis.txt`, or any repository in the `analysis` directory.

To install and use:

```bash
npm install
npm run analyze <directory>
```

Example output:

```
============================================================
📊 AST ANALYSIS RESULTS
============================================================

📁 FILE STATISTICS:
   Total files found: 1497
   Successfully parsed: 1497
   Failed to parse: 0
   Total file size: 8.2 MB

🌳 NODE STATISTICS:
   Total nodes: 1,020,120
   Average nodes per file: 681
   Average file size: 5.6 KB

📋 ALL NODE TYPES (BY FILE PRESENCE):
   Program                        1497 files (100.0%) -    1,497 total (0.15%)
   Identifier                     1457 files ( 97.3%) -  377,562 total (37.01%)
   Literal                        1434 files ( 95.8%) -   81,391 total (7.98%)
   ExpressionStatement            1364 files ( 91.1%) -   45,129 total (4.42%)
   CallExpression                 1333 files ( 89.0%) -   57,043 total (5.59%)
   MemberExpression               1313 files ( 87.7%) -   92,271 total (9.05%)
   VariableDeclaration            1283 files ( 85.7%) -   28,312 total (2.78%)
...
```

There is also a script to download some popular repositories for testing:

```bash
npm run download-repos
```

and then analyze all of them:

```bash
npm run analyze-all
```
