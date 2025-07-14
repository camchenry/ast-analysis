#!/usr/bin/env node

import { readdirSync, statSync, writeFileSync } from "fs";
import { join } from "path";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, "..");
const sampleReposDir = join(projectRoot, "sample-repos");
const analysisDir = join(projectRoot, "analysis");

// Configuration
const EXAMPLE_COUNT = 10; // Number of files to show per node type category

/**
 * Run the analysis script on a specific repository and capture output
 */
function analyzeRepository(repoName, repoPath) {
  return new Promise((resolve, reject) => {
    console.log(`🔍 Analyzing ${repoName}...`);

    const child = spawn(
      "node",
      [
        join(projectRoot, "src", "index.js"),
        repoPath,
        EXAMPLE_COUNT.toString(),
      ],
      {
        stdio: ["pipe", "pipe", "pipe"],
        cwd: projectRoot,
      }
    );

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      // Filter out progress lines from stdout
      const cleanedStdout = stdout
        .split("\n")
        .filter((line) => !line.includes("📊 Analyzing..."))
        .join("\n");

      if (code === 0) {
        resolve({ stdout: cleanedStdout, stderr, success: true });
      } else {
        resolve({
          stdout: cleanedStdout,
          stderr,
          success: false,
          exitCode: code,
        });
      }
    });

    child.on("error", (error) => {
      reject(error);
    });
  });
}

/**
 * Get all repository directories
 */
function getRepositories() {
  try {
    const entries = readdirSync(sampleReposDir);
    const repos = [];

    for (const entry of entries) {
      const entryPath = join(sampleReposDir, entry);
      try {
        const stats = statSync(entryPath);
        if (stats.isDirectory()) {
          repos.push({
            name: entry,
            path: entryPath,
          });
        }
      } catch (error) {
        console.warn(`⚠️  Skipping ${entry}: ${error.message}`);
      }
    }

    return repos.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error(`❌ Error reading sample-repos directory: ${error.message}`);
    return [];
  }
}

/**
 * Save analysis results to file
 */
function saveResults(repoName, result) {
  const filename = `${repoName}.txt`;
  const filepath = join(analysisDir, filename);

  let content = `AST Analysis Report for ${repoName}\n`;
  content += `Generated on: ${new Date().toISOString()}\n`;
  content += `Repository: sample-repos/${repoName}\n`;
  content += "=".repeat(80) + "\n\n";

  if (result.success) {
    content += result.stdout;
  } else {
    content += `❌ Analysis failed with exit code: ${result.exitCode}\n\n`;
    content += "STDOUT:\n";
    content += result.stdout;
    content += "\n\nSTDERR:\n";
    content += result.stderr;
  }

  if (result.stderr && result.success) {
    content += "\n\nWarnings/Errors:\n";
    content += result.stderr;
  }

  try {
    writeFileSync(filepath, content, "utf-8");
    console.log(`   ✅ Results saved to: analysis/${filename}`);
  } catch (error) {
    console.error(`   ❌ Failed to save results: ${error.message}`);
  }
}

/**
 * Main function to analyze all repositories
 */
async function main() {
  console.log("🚀 Starting analysis of all repositories in sample-repos/\n");

  const repositories = getRepositories();

  if (repositories.length === 0) {
    console.log("❌ No repositories found in sample-repos directory.");
    process.exit(1);
  }

  console.log(`📁 Found ${repositories.length} repositories to analyze:\n`);
  repositories.forEach((repo, index) => {
    console.log(`   ${(index + 1).toString().padStart(2)}. ${repo.name}`);
  });
  console.log();

  const results = {
    successful: 0,
    failed: 0,
    total: repositories.length,
  };

  // Analyze each repository
  for (let i = 0; i < repositories.length; i++) {
    const repo = repositories[i];
    const progress = `[${i + 1}/${repositories.length}]`;

    try {
      console.log(`${progress} 🔍 Analyzing ${repo.name}...`);
      const result = await analyzeRepository(repo.name, repo.path);

      if (result.success) {
        results.successful++;
        console.log(`${progress} ✅ ${repo.name} - Analysis completed`);
      } else {
        results.failed++;
        console.log(
          `${progress} ❌ ${repo.name} - Analysis failed (exit code: ${result.exitCode})`
        );
      }

      saveResults(repo.name, result);
    } catch (error) {
      results.failed++;
      console.error(`${progress} ❌ ${repo.name} - Error: ${error.message}`);

      // Save error information
      saveResults(repo.name, {
        success: false,
        stdout: "",
        stderr: error.message,
        exitCode: 1,
      });
    }

    console.log(); // Add spacing between repositories
  }

  // Summary
  console.log("=".repeat(60));
  console.log("📊 ANALYSIS SUMMARY");
  console.log("=".repeat(60));
  console.log(`✅ Successful analyses: ${results.successful}`);
  console.log(`❌ Failed analyses: ${results.failed}`);
  console.log(`📁 Total repositories: ${results.total}`);
  console.log(`📂 Results saved in: analysis/`);
  console.log("=".repeat(60));

  if (results.failed > 0) {
    console.log(
      "\n⚠️  Some analyses failed. Check the individual result files for details."
    );
    process.exit(1);
  } else {
    console.log("\n🎉 All analyses completed successfully!");
  }
}

// Handle uncaught errors
process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught exception:", error.message);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled rejection at:", promise, "reason:", reason);
  process.exit(1);
});

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error("❌ Error:", error.message);
    process.exit(1);
  });
}
