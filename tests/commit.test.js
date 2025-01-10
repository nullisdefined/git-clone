const { Commit } = require("../src/objects/commit");

jest.mock("crypto", () => ({
  createHash: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn().mockReturnValue("mockedHash123"),
  })),
}));

jest.mock("fs", () => ({
  promises: {
    mkdir: jest.fn().mockResolvedValue(undefined),
    writeFile: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock("path", () => ({
  join: (...args) => args.join("/"),
}));

describe("Commit", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("constructor", () => {
    it("should create a commit with correct properties", () => {
      const treeHash = "tree123";
      const message = "Initial commit";
      const parentHash = "parent123";

      const commit = new Commit(treeHash, message, parentHash);

      expect(commit.type).toBe("commit");
      expect(commit.treeHash).toBe(treeHash);
      expect(commit.parentHash).toBe(parentHash);
      expect(commit.message).toBe(message);
      expect(commit.author).toBe("Hong Gil Dong <hong@example.com>");
      expect(commit.committer).toBe("Hong Gil Dong <hong@example.com>");
      expect(commit.timestamp).toBeDefined();
      expect(commit.timezone).toMatch(/[+-]\d{4}/);
    });

    it("should handle commit without parent", () => {
      const commit = new Commit("tree123", "Initial commit");
      expect(commit.parentHash).toBeNull();
    });
  });

  describe("serialize", () => {
    it("should serialize commit with parent hash", () => {
      const commit = new Commit("tree123", "Test commit", "parent123");
      commit.timestamp = 1234567890;

      const serialized = commit.serialize();

      expect(serialized).toContain("tree tree123\n");
      expect(serialized).toContain("parent parent123\n");
      expect(serialized).toContain("author Hong Gil Dong");
      expect(serialized).toContain("committer Hong Gil Dong");
      expect(serialized).toContain("1234567890");
      expect(serialized).toMatch(/[+-]\d{4}/);
      expect(serialized).toContain("\nTest commit\n");
    });

    it("should serialize commit without parent hash", () => {
      const commit = new Commit("tree123", "Initial commit");
      commit.timestamp = 1234567890;

      const serialized = commit.serialize();

      expect(serialized).toContain("tree tree123\n");
      expect(serialized).not.toContain("parent");
      expect(serialized).toContain("\nInitial commit\n");
    });
  });

  describe("calculateHash", () => {
    it("should calculate hash with correct format", () => {
      const commit = new Commit("tree123", "Test commit", "parent123");
      commit.timestamp = 1234567890;

      const content = commit.serialize();
      const expectedData = `commit ${content.length}\0${content}`;
      const hash = commit.calculateHash();

      const crypto = require("crypto");
      expect(crypto.createHash).toHaveBeenCalledWith("sha1");
      expect(hash).toBe("mockedHash123");
    });
  });

  describe("save", () => {
    it("should save commit to correct path", async () => {
      const commit = new Commit("tree123", "Test commit");
      const hash = await commit.save("/test/repo");

      const fs = require("fs");
      expect(fs.promises.mkdir).toHaveBeenCalledWith(
        expect.stringContaining("/test/repo/.pit/objects"),
        expect.any(Object)
      );
      expect(fs.promises.writeFile).toHaveBeenCalled();
      expect(hash).toBe("mockedHash123");
    });

    it("should handle save errors", async () => {
      const commit = new Commit("tree123", "Test commit");
      const fs = require("fs");
      fs.promises.mkdir.mockRejectedValueOnce(new Error("Save failed"));

      await expect(commit.save("/test/repo")).rejects.toThrow("Save failed");
    });
  });
});
