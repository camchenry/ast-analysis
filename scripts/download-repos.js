#!/usr/bin/env node

import { spawn } from "child_process";
import { existsSync, mkdirSync } from "fs";
import { join } from "path";

// Popular JavaScript/TypeScript repositories
const repositories = [
  // Frontend Frameworks & Libraries
  "facebook/react",
  "vuejs/vue",
  "angular/angular",
  "sveltejs/svelte",
  "preactjs/preact",
  "solidjs/solid",
  "alpinejs/alpine",

  // Backend & Runtime
  "nodejs/node",
  "denoland/deno",
  "vercel/next.js",
  "nuxt/nuxt",
  "remix-run/remix",
  "fastify/fastify",
  "expressjs/express",
  "koajs/koa",
  "nestjs/nest",

  // Build Tools & Bundlers
  "vitejs/vite",
  "webpack/webpack",
  "rollup/rollup",
  "parcel-bundler/parcel",
  "swc-project/swc",

  // TypeScript & Language Tools
  "microsoft/TypeScript",
  "typescript-eslint/typescript-eslint",
  "prettier/prettier",
  "eslint/eslint",
  "babel/babel",

  // Testing
  "jestjs/jest",
  "vitest-dev/vitest",
  "cypress-io/cypress",
  "mochajs/mocha",

  // State Management
  "reduxjs/redux",
  "mobxjs/mobx",
  "pmndrs/jotai",
  "TanStack/query",

  // UI Libraries
  "mui/material-ui",
  "ant-design/ant-design",
  "chakra-ui/chakra-ui",
  "styled-components/styled-components",
  "tailwindlabs/tailwindcss",

  // Development Tools
  "storybookjs/storybook",
  "typicode/husky",
  "conventional-changelog/commitizen",
  "semantic-release/semantic-release",

  // Utilities & Libraries
  "lodash/lodash",
  "axios/axios",
  "date-fns/date-fns",
  "moment/moment",
  "ramda/ramda",
  "immutable-js/immutable-js",
];

async function cloneRepository(repo, targetDir) {
  return new Promise((resolve) => {
    const repoName = repo.split("/")[1];
    const repoPath = join(targetDir, repoName);

    // Skip if already exists
    if (existsSync(repoPath)) {
      console.log(`⏭️  Skipping ${repo} (already exists)`);
      resolve(true);
      return;
    }

    console.log(`📥 Cloning ${repo}...`);

    const git = spawn(
      "git",
      [
        "clone",
        "--depth",
        "1", // Shallow clone for faster download
        "--single-branch",
        `https://github.com/${repo}.git`,
        repoPath,
      ],
      {
        stdio: "pipe",
      }
    );

    let stderr = "";

    git.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    git.on("close", (code) => {
      if (code === 0) {
        console.log(`✅ Successfully cloned ${repo}`);
        resolve(true);
      } else {
        console.error(`❌ Failed to clone ${repo}: ${stderr}`);
        resolve(false);
      }
    });

    git.on("error", (error) => {
      console.error(`❌ Error cloning ${repo}: ${error.message}`);
      resolve(false);
    });
  });
}

async function downloadRepositories() {
  const targetDir = "sample-repos";

  // Ensure target directory exists
  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true });
  }

  console.log(`🚀 Starting download of ${repositories.length} repositories...`);
  console.log(`📁 Target directory: ${targetDir}\n`);

  let successCount = 0;
  let failCount = 0;

  // Clone repositories with some concurrency control
  const batchSize = 5; // Clone 5 repos at a time

  for (let i = 0; i < repositories.length; i += batchSize) {
    const batch = repositories.slice(i, i + batchSize);
    console.log(
      `\n📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(
        repositories.length / batchSize
      )}`
    );

    const promises = batch.map((repo) => cloneRepository(repo, targetDir));
    const results = await Promise.all(promises);

    results.forEach((success) => {
      if (success) {
        successCount++;
      } else {
        failCount++;
      }
    });

    // Small delay between batches to be nice to GitHub
    if (i + batchSize < repositories.length) {
      console.log("⏳ Waiting 2 seconds before next batch...");
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("📊 DOWNLOAD SUMMARY");
  console.log("=".repeat(60));
  console.log(`✅ Successfully downloaded: ${successCount}`);
  console.log(`❌ Failed downloads: ${failCount}`);
  console.log(`📁 Total repositories: ${repositories.length}`);
  console.log(`📂 Location: ${join(process.cwd(), targetDir)}`);

  if (successCount > 0) {
    console.log("\n🎉 You can now run the analyzer on these repositories!");
    console.log("Example commands:");
    console.log(`  npm run analyze ${targetDir}/react`);
    console.log(`  npm run analyze ${targetDir}/typescript`);
    console.log(`  npm run analyze ${targetDir}`);
  }
}

// Run the download script
downloadRepositories().catch((error) => {
  console.error("❌ Download script failed:", error.message);
  process.exit(1);
});
