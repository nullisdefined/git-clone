#!/usr/bin/env node
const { Command } = require("commander");
const fs = require("fs");
const path = require("path");
const ignore = require("ignore");

const packageJson = require("./package.json");

const { Blob } = require("./src/objects/blob");
const { Tree } = require("./src/objects/tree");
const { Commit } = require("./src/objects/commit");

const program = new Command();

program
  .name("pit")
  .description("Pit CLI")
  .version(packageJson.version, "-v, --version", "Output the current version");

program
  .command("init")
  .description("Initialize a new pit repository")
  .action(async () => {
    const repoPath = process.cwd();
    await pitInit(repoPath);
  });

program
  .command("add <files...>")
  .description("Add file(s) to the repository")
  .action(async (files) => {
    const repoPath = process.cwd();
    await checkPitRepo(repoPath);
    await pitAdd(repoPath, files);
  });

program
  .command("commit")
  .description("Commit changes")
  .option("-m, --message <msg>", "Commit message")
  .action(async (options) => {
    const repoPath = process.cwd();
    await checkPitRepo(repoPath);
    const message = options.message || "Default commit message";
    await pitCommit(repoPath, message);
  });

program.parse(process.argv);

async function pitInit(repoPath) {
  const pitDir = path.join(repoPath, ".pit");
  const objectsDir = path.join(pitDir, "objects");

  if (fs.existsSync(pitDir)) {
    console.log("Reinitialized existing Pit repository in", pitDir);
    return;
  }
  fs.mkdirSync(objectsDir, { recursive: true });
  console.log("Initialized empty Pit repository in", pitDir);
}

async function checkPitRepo(repoPath) {
  const pitDir = path.join(repoPath, ".pit");
  if (!fs.existsSync(pitDir)) {
    console.error("Not a pit repository (or any of the parent directories)");
    process.exit(1);
  }
}

async function pitAdd(repoPath, filePaths) {
  if (!filePaths || filePaths.length === 0) {
    console.log("Add file path(s) to the repository");
    return;
  }

  const ig = ignore();
  const pitIgnorePath = path.join(repoPath, ".pitignore");
  if (fs.existsSync(pitIgnorePath)) {
    const ignoreRules = fs.readFileSync(pitIgnorePath, "utf8");
    ig.add(ignoreRules.split("\n").filter((line) => line.trim() !== ""));
  }

  const allFiles = new Set();

  for (const fp of filePaths) {
    const fullPath = path.join(repoPath, fp);

    if (!fs.existsSync(fullPath)) {
      console.error(`File or directory not found: ${fp}`);
      continue;
    }

    const stat = fs.statSync(fullPath);
    if (stat.isFile() && !ig.ignores(path.relative(repoPath, fullPath))) {
      allFiles.add(fullPath);
    } else if (stat.isDirectory()) {
      await collectFiles(fullPath, allFiles, ig, repoPath);
    }
  }

  for (const filePath of allFiles) {
    try {
      const content = fs.readFileSync(filePath, "utf8");
      const blob = new Blob(content);
      await blob.save(repoPath);
      const relativePath = path.relative(repoPath, filePath);
      // console.log(
      //   `File ${relativePath} -> Object created (hash: ${blob.hash})`
      // );
    } catch (err) {
      console.error(`Failed to read file: ${filePath}`, err.message);
    }
  }
}

async function collectFiles(dirPath, fileSet, ig, repoPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    const relativePath = path.relative(repoPath, fullPath);

    if (ig.ignores(relativePath)) {
      continue;
    }

    if (entry.isFile()) {
      fileSet.add(fullPath);
    } else if (entry.isDirectory()) {
      await collectFiles(fullPath, fileSet, ig, repoPath);
    }
  }
}

async function pitCommit(repoPath, message) {
  const tree = new Tree();

  const allFiles = fs.readdirSync(repoPath);
  for (const file of allFiles) {
    if (file === ".pit" || file === "node_modules") continue;

    const filePath = path.join(repoPath, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      continue;
    }

    const content = fs.readFileSync(filePath, "utf8");
    const blob = new Blob(content);
    await blob.save(repoPath);
    tree.addEntry(file, blob.hash, "100644");
  }

  const treeHash = await tree.save(repoPath);

  const commit = new Commit(treeHash, message, null);
  const commitHash = await commit.save(repoPath);

  console.log(`commit created: ${commitHash}`);
  console.log(`tree hash: ${treeHash}`);
  console.log(`commit message: ${message}`);
}
