const crypto = require("crypto");
const fs = require("fs").promises;
const path = require("path");

class Commit {
  constructor(treeHash, message, parentHash = null) {
    this.type = "commit";
    this.treeHash = treeHash;
    this.parentHash = parentHash;
    this.message = message;
    this.author = "Hong Gil Dong <hong@example.com>";
    this.committer = "Hong Gil Dong <hong@example.com>";
    this.timestamp = Math.floor(Date.now() / 1000);
    this.timezone = this.getTimezoneOffset();
  }

  getTimezoneOffset() {
    const offset = -new Date().getTimezoneOffset();
    const hours = Math.floor(Math.abs(offset) / 60);
    const minutes = Math.abs(offset) % 60;
    const sign = offset >= 0 ? "+" : "-";
    return `${sign}${String(hours).padStart(2, "0")}${String(minutes).padStart(
      2,
      "0"
    )}`;
  }

  serialize() {
    let content = `tree ${this.treeHash}\n`;
    if (this.parentHash) {
      content += `parent ${this.parentHash}\n`;
    }
    content += `author ${this.author} ${this.timestamp} ${this.timezone}\n`;
    content += `committer ${this.committer} ${this.timestamp} ${this.timezone}\n`;
    content += `\n${this.message}\n`;
    return content;
  }

  calculateHash() {
    const content = this.serialize();
    const header = `${this.type} ${content.length}\0`;
    const data = header + content;
    return crypto.createHash("sha1").update(data).digest("hex");
  }

  async save(repoPath) {
    const hash = this.calculateHash();
    const objectsPath = path.join(repoPath, ".pit", "objects");
    const folderName = hash.slice(0, 2);
    const fileName = hash.slice(2);
    const folderPath = path.join(objectsPath, folderName);

    await fs.mkdir(folderPath, { recursive: true });
    await fs.writeFile(path.join(folderPath, fileName), this.serialize());

    return hash;
  }
}

module.exports = { Commit };
