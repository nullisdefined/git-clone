export class Blob {
  constructor(content) {
    this.type = "blob";
    this.content = content;
    this.hash = this.calculateHash();
  }

  calculateHash() {
    const header = `${this.type} ${this.content.length}\0`;
    const data = header + this.content;
    return crypto.createHash("sha1").update(this.content).digest("hex");
  }

  async save(repoPath) {
    const objectsPath = path.join(repoPath, ".pit", "objects");
    const folderName = this.hash.slice(0, 2);
    const fileName = this.hash.slice(2);
    const folderPath = path.join(objectsPath, folderName);

    await fs.mkdir(folderPath, { recursive: true });
    await fs.writeFile(path.join(folderPath, fileName), this.content);
  }
}
