#!/usr/bin/env node

import { readFileSync, statSync } from 'fs';
import { join } from 'path';
import { glob } from 'glob';
import { parseSync } from 'oxc-parser';

/**
 * Recursively count all AST nodes and their types
 */
function countNodes(node, counts = {}, total = { count: 0 }) {
  if (!node || typeof node !== 'object') {
    return counts;
  }

  // Count this node
  total.count++;
  
  // Get the node type
  const nodeType = node.type || 'Unknown';
  counts[nodeType] = (counts[nodeType] || 0) + 1;

  // Recursively count child nodes
  for (const key in node) {
    if (key === 'type' || key === 'start' || key === 'end' || key === 'loc' || key === 'range') {
      continue; // Skip metadata properties
    }
    
    const value = node[key];
    
    if (Array.isArray(value)) {
      // Handle arrays of nodes
      for (const item of value) {
        if (item && typeof item === 'object') {
          countNodes(item, counts, total);
        }
      }
    } else if (value && typeof value === 'object') {
      // Handle single child nodes
      countNodes(value, counts, total);
    }
  }

  return counts;
}

/**
 * Parse a single file and return node statistics
 */
function analyzeFile(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    
    // Parse the file using oxc-parser (filename first, then content)
    const result = parseSync(filePath, content);

    if (result.errors && result.errors.length > 0) {
      console.warn(`⚠️  Parse errors in ${filePath}:`);
      result.errors.forEach(error => {
        console.warn(`   ${error.message}`);
      });
    }

    // Count nodes in the AST
    const nodeCounts = {};
    const totalCount = { count: 0 };
    countNodes(result.program, nodeCounts, totalCount);

    return {
      filePath,
      success: true,
      nodeCounts,
      totalNodes: totalCount.count,
      parseErrors: result.errors?.length || 0
    };
  } catch (error) {
    console.error(`❌ Failed to parse ${filePath}: ${error.message}`);
    return {
      filePath,
      success: false,
      error: error.message,
      nodeCounts: {},
      totalNodes: 0,
      parseErrors: 1
    };
  }
}

/**
 * Find all JavaScript/TypeScript files in a directory
 */
async function findFiles(directory) {
  const patterns = [
    '**/*.js',
    '**/*.jsx',
    '**/*.ts',
    '**/*.tsx',
    '**/*.mjs',
    '**/*.cjs'
  ];

  const allFiles = [];
  
  for (const pattern of patterns) {
    const files = await glob(pattern, {
      cwd: directory,
      ignore: [
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/.git/**',
        '**/coverage/**',
        '**/*.min.js',
        '**/*.bundle.js'
      ]
    });
    
    // Convert to absolute paths
    const absoluteFiles = files.map(file => join(directory, file));
    allFiles.push(...absoluteFiles);
  }

  // Remove duplicates and return
  return [...new Set(allFiles)];
}

/**
 * Format file size in human readable format
 */
function formatFileSize(bytes) {
  const units = ['B', 'KB', 'MB', 'GB'];
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
async function analyzeDirectory(targetDirectory) {
  console.log(`🔍 Analyzing JavaScript/TypeScript files in: ${targetDirectory}\n`);

  // Find all relevant files
  const files = await findFiles(targetDirectory);
  
  if (files.length === 0) {
    console.log('❌ No JavaScript/TypeScript files found in the specified directory.');
    return;
  }

  console.log(`📁 Found ${files.length} files to analyze...\n`);

  // Analyze each file
  const results = [];
  const globalNodeCounts = {};
  let totalNodes = 0;
  let successfulFiles = 0;
  let totalSize = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    process.stdout.write(`\r📊 Analyzing... ${i + 1}/${files.length} (${Math.round((i + 1) / files.length * 100)}%)`);
    
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
      
      // Aggregate node counts
      for (const [nodeType, count] of Object.entries(result.nodeCounts)) {
        globalNodeCounts[nodeType] = (globalNodeCounts[nodeType] || 0) + count;
      }
    }
  }

  console.log('\n\n' + '='.repeat(60));
  console.log('📊 AST ANALYSIS RESULTS');
  console.log('='.repeat(60));

  // File statistics
  console.log('\n📁 FILE STATISTICS:');
  console.log(`   Total files found: ${files.length}`);
  console.log(`   Successfully parsed: ${successfulFiles}`);
  console.log(`   Failed to parse: ${files.length - successfulFiles}`);
  console.log(`   Total file size: ${formatFileSize(totalSize)}`);

  // Node statistics
  console.log('\n🌳 NODE STATISTICS:');
  console.log(`   Total nodes: ${totalNodes.toLocaleString()}`);
  console.log(`   Average nodes per file: ${successfulFiles > 0 ? Math.round(totalNodes / successfulFiles).toLocaleString() : 0}`);
  console.log(`   Average file size: ${successfulFiles > 0 ? formatFileSize(Math.round(totalSize / successfulFiles)) : '0 B'}`);

  // Top node types
  console.log('\n🏆 TOP NODE TYPES:');
  const sortedNodeTypes = Object.entries(globalNodeCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 15);

  sortedNodeTypes.forEach(([nodeType, count], index) => {
    const percentage = ((count / totalNodes) * 100).toFixed(1);
    console.log(`   ${(index + 1).toString().padStart(2)}.  ${nodeType.padEnd(25)} ${count.toLocaleString().padStart(8)} (${percentage}%)`);
  });

  // All node types (if requested)
  console.log('\n📝 ALL NODE TYPES:');
  const allNodeTypes = Object.entries(globalNodeCounts)
    .sort(([,a], [,b]) => b - a);

  allNodeTypes.forEach(([nodeType, count]) => {
    const percentage = ((count / totalNodes) * 100).toFixed(2);
    console.log(`   ${nodeType.padEnd(30)} ${count.toLocaleString().padStart(8)} (${percentage}%)`);
  });

  // Failed files (if any)
  const failedFiles = results.filter(r => !r.success);
  if (failedFiles.length > 0) {
    console.log('\n❌ FAILED FILES:');
    failedFiles.forEach(result => {
      console.log(`   ${result.filePath}: ${result.error}`);
    });
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Analysis complete!');
}

// Command line interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: npm run analyze <directory>');
    console.log('Example: npm run analyze ./src');
    process.exit(1);
  }

  const targetDirectory = args[0];
  
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

  await analyzeDirectory(targetDirectory);
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
}

export { analyzeDirectory, analyzeFile, countNodes };
