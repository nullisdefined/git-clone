#!/usr/bin/env node
const { Command } = require("commander");
const fs = require("fs");
const path = require("path");

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
    await pitAdd(repoPath, files);
  });

program
  .command("commit")
  .description("Commit changes")
  .option("-m, --message <msg>", "Commit message")
  .action(async (options) => {
    const repoPath = process.cwd();
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

async function pitAdd(repoPath, filePaths) {
  if (!filePaths || filePaths.length === 0) {
    console.log("Add file path(s) to the repository");
    return;
  }

  for (const fp of filePaths) {
    const fullPath = path.join(repoPath, fp);
    try {
      const content = fs.readFileSync(fullPath, "utf8");
      const blob = new Blob(content);
      await blob.save(repoPath);
      console.log(`file ${fp} -> object created (hash: ${blob.hash})`);
    } catch (err) {
      console.error(`file not found: ${fp}`, err.message);
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
