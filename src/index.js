#!/usr/bin/env node

import { readFileSync, statSync } from "fs";
import { join } from "path";
import { glob } from "glob";
import { parseSync } from "oxc-parser";
import { walk } from "oxc-walker";

/**
 * Count all AST nodes and their types using oxc-walker
 */
function countNodes(ast) {
  const counts = {};
  let totalCount = 0;

  walk(ast, {
    enter(node) {
      totalCount++;
      const nodeType = node.type || "Unknown";
      counts[nodeType] = (counts[nodeType] || 0) + 1;
    }
  });

  return { counts, totalCount };
}

/**
 * Parse a single file and return node statistics
 */
function analyzeFile(filePath) {
  try {
    const content = readFileSync(filePath, "utf-8");

    // Parse the file using oxc-parser (filename first, then content)
    const result = parseSync(filePath, content);

    if (result.errors && result.errors.length > 0) {
      console.warn(`⚠️  Parse errors in ${filePath}:`);
      result.errors.forEach((error) => {
        console.warn(`   ${error.message}`);
      });
    }

    // Count nodes in the AST
    const { counts: nodeCounts, totalCount } = countNodes(result.program);

    return {
      filePath,
      success: true,
      nodeCounts,
      totalNodes: totalCount,
      parseErrors: result.errors?.length || 0,
    };
  } catch (error) {
    console.error(`❌ Failed to parse ${filePath}: ${error.message}`);
    return {
      filePath,
      success: false,
      error: error.message,
      nodeCounts: {},
      totalNodes: 0,
      parseErrors: 1,
    };
  }
}

/**
 * Find all JavaScript/TypeScript files in a directory
 */
async function findFiles(directory) {
  const allFiles = [];

  const files = await glob("**/*.{js,jsx,ts,tsx,mjs,cjs}", {
    cwd: directory,
    ignore: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/.git/**",
      "**/coverage/**",
      "**/*.min.js",
      "**/*.bundle.js",
      "**/fixture/**",
      "**/fixtures/**",
      "**/*conformance*",
    ],
  });

  for (const file of files) {
    allFiles.push(join(directory, file));
  }

  return allFiles;
}

/**
 * Format file size in human readable format
 */
function formatFileSize(bytes) {
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Main analysis function
 */
async function analyzeDirectory(targetDirectory, options = {}) {
  const { exampleCount } = options;

  console.log(
    `🔍 Analyzing JavaScript/TypeScript files in: ${targetDirectory}\n`
  );

  // Find all relevant files
  const files = await findFiles(targetDirectory);

  if (files.length === 0) {
    console.log(
      "❌ No JavaScript/TypeScript files found in the specified directory."
    );
    return;
  }

  console.log(`📁 Found ${files.length} files to analyze...\n`);

  // Analyze each file
  const results = [];
  const globalNodeCounts = {};
  const nodeFilePresence = {}; // Track which files contain each node type
  const nodeFileExamples = {}; // Track file examples for each node type
  const filesWithoutNodeType = {}; // Track files that don't contain each node type
  let totalNodes = 0;
  let successfulFiles = 0;
  let totalSize = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    // process.stdout.write(
    //   `\r📊 Analyzing... ${i + 1}/${files.length} (${Math.round(
    //     ((i + 1) / files.length) * 100
    //   )}%)`
    // );

    try {
      const stats = statSync(file);
      totalSize += stats.size;
    } catch {
      // File might not exist or be accessible
    }

    const result = analyzeFile(file);
    results.push(result);

    if (result.success) {
      successfulFiles++;
      totalNodes += result.totalNodes;

      // Aggregate node counts and track file presence
      for (const [nodeType, count] of Object.entries(result.nodeCounts)) {
        globalNodeCounts[nodeType] = (globalNodeCounts[nodeType] || 0) + count;

        // Track file presence for this node type
        if (!nodeFilePresence[nodeType]) {
          nodeFilePresence[nodeType] = new Set();
        }
        nodeFilePresence[nodeType].add(file);

        // Track file examples for this node type (limit to exampleCount)
        if (!nodeFileExamples[nodeType]) {
          nodeFileExamples[nodeType] = [];
        }
        if (nodeFileExamples[nodeType].length < exampleCount) {
          nodeFileExamples[nodeType].push(file);
        }
      }
    }
  }

  // Second pass: find files that don't contain each node type
  for (const nodeType of Object.keys(globalNodeCounts)) {
    filesWithoutNodeType[nodeType] = [];
    const filesWithThisNode = nodeFilePresence[nodeType] || new Set();

    for (const result of results) {
      if (result.success && !filesWithThisNode.has(result.filePath)) {
        if (filesWithoutNodeType[nodeType].length < exampleCount) {
          filesWithoutNodeType[nodeType].push(result.filePath);
        }
      }
    }
  }

  console.log("\n\n" + "=".repeat(60));
  console.log("📊 AST ANALYSIS RESULTS");
  console.log("=".repeat(60));

  // File statistics
  console.log("\n📁 FILE STATISTICS:");
  console.log(`   Total files found: ${files.length}`);
  console.log(`   Successfully parsed: ${successfulFiles}`);
  console.log(`   Failed to parse: ${files.length - successfulFiles}`);
  console.log(`   Total file size: ${formatFileSize(totalSize)}`);

  // Node statistics
  console.log("\n🌳 NODE STATISTICS:");
  console.log(`   Total nodes: ${totalNodes.toLocaleString()}`);
  console.log(
    `   Average nodes per file: ${
      successfulFiles > 0
        ? Math.round(totalNodes / successfulFiles).toLocaleString()
        : 0
    }`
  );
  console.log(
    `   Average file size: ${
      successfulFiles > 0
        ? formatFileSize(Math.round(totalSize / successfulFiles))
        : "0 B"
    }`
  );

  // All node types ordered by file presence
  console.log("\n📋 ALL NODE TYPES (BY FILE PRESENCE):");
  const allNodeTypesByFilePresence = Object.entries(nodeFilePresence)
    .map(([nodeType, fileSet]) => [
      nodeType,
      fileSet.size,
      globalNodeCounts[nodeType] || 0,
    ])
    .sort(([, a], [, b]) => b - a);

  allNodeTypesByFilePresence.forEach(([nodeType, fileCount, totalCount]) => {
    const filePercentage = ((fileCount / successfulFiles) * 100).toFixed(1);
    const countPercentage = ((totalCount / totalNodes) * 100).toFixed(2);
    console.log(
      `   ${nodeType.padEnd(30)} ${fileCount
        .toString()
        .padStart(6)} files (${filePercentage.padStart(5)}%) - ${totalCount
        .toLocaleString()
        .padStart(13)} total (${countPercentage.padStart(5)}%)`
    );
  });

  // All node types (if requested)
  console.log("\n📝 ALL NODE TYPES (BY TOTAL COUNT):");
  const allNodeTypes = Object.entries(globalNodeCounts).sort(
    ([, a], [, b]) => b - a
  );

  allNodeTypes.forEach(([nodeType, count]) => {
    const countPercentage = ((count / totalNodes) * 100).toFixed(2);
    const fileCount = nodeFilePresence[nodeType]?.size || 0;
    const filePercentage = ((fileCount / successfulFiles) * 100).toFixed(1);
    console.log(
      `   ${nodeType.padEnd(30)} ${count
        .toLocaleString()
        .padStart(13)} (${countPercentage.padStart(5)}%) in ${fileCount
        .toString()
        .padStart(6)} files (${filePercentage.padStart(5)}%)`
    );
  });

  // File examples for each node type
  console.log("\n📁 FILE EXAMPLES BY NODE TYPE:");
  allNodeTypes.forEach(([nodeType, _count]) => {
    console.log(`\n   ${nodeType}:`);

    // Files WITH this node type
    const filesWithNode = nodeFileExamples[nodeType] || [];
    const filesWithoutNode = filesWithoutNodeType[nodeType] || [];

    if (filesWithNode.length > 0) {
      console.log(
        `     📄 Files WITH ${nodeType} (showing ${filesWithNode.length}):`
      );
      filesWithNode.forEach((file) => {
        const relativePath = file
          .replace(targetDirectory, "")
          .replace(/^\//, "");
        console.log(`       • ${relativePath}`);
      });
    } else {
      console.log(`     📄 Files WITH ${nodeType}: (none found)`);
    }

    if (filesWithoutNode.length > 0) {
      console.log(
        `     📄 Files WITHOUT ${nodeType} (showing ${filesWithoutNode.length}):`
      );
      filesWithoutNode.forEach((file) => {
        const relativePath = file
          .replace(targetDirectory, "")
          .replace(/^\//, "");
        console.log(`       • ${relativePath}`);
      });
    } else {
      console.log(
        `     📄 Files WITHOUT ${nodeType}: (all files contain this node type)`
      );
    }
  });

  // Failed files (if any)
  const failedFiles = results.filter((r) => !r.success);
  if (failedFiles.length > 0) {
    console.log("\n❌ FAILED FILES:");
    failedFiles.forEach((result) => {
      console.log(`   ${result.filePath}: ${result.error}`);
    });
  }

  console.log("\n" + "=".repeat(60));
  console.log("✅ Analysis complete!");
}

// Command line interface
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log("Usage: npm run analyze <directory> [exampleCount]");
    console.log("Example: npm run analyze ./src 5");
    process.exit(1);
  }

  const targetDirectory = args[0];
  const exampleCount = args[1] ? parseInt(args[1], 10) : 10;

  if (isNaN(exampleCount) || exampleCount < 1) {
    console.error("❌ Error: exampleCount must be a positive number");
    process.exit(1);
  }

  try {
    const stats = statSync(targetDirectory);
    if (!stats.isDirectory()) {
      console.error(`❌ Error: ${targetDirectory} is not a directory`);
      process.exit(1);
    }
  } catch {
    console.error(`❌ Error: Directory ${targetDirectory} does not exist`);
    process.exit(1);
  }

  await analyzeDirectory(targetDirectory, { exampleCount });
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error("❌ Error:", error.message);
    process.exit(1);
  });
}

export { analyzeDirectory, analyzeFile, countNodes };
