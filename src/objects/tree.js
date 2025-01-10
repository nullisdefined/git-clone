const crypto = require("crypto");
const fs = require("fs").promises;
const path = require("path");

class Tree {
  constructor() {
    this.type = "tree";
    this.entries = new Map();
    this.hash = null;
  }

  addEntry(name, hash, mode = "100644") {
    this.entries.set(name, { hash, mode });
    this.hash = null;
  }

  serialize() {
    let content = "";
    const sortedEntries = Array.from(this.entries.entries()).sort(([a], [b]) =>
      a.localeCompare(b)
    );

    for (const [name, { mode, hash }] of sortedEntries) {
      const type = mode === "040000" ? "tree" : "blob";
      content += `${mode} ${type} ${hash}\t${name}`;
    }

    return content;
  }

  calculateHash() {
    if (this.hash) return this.hash; // 이미 계산된 경우 그대로 반환

    const content = this.serialize();
    const header = `${this.type} ${content.length}\0`;
    const data = header + content;
    this.hash = crypto.createHash("sha1").update(data).digest("hex");
    return this.hash;
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

module.exports = { Tree };
