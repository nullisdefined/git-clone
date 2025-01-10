const { Tree } = require("../src/objects/tree");
const crypto = require("crypto");

const mockUpdate = jest.fn().mockReturnThis();
const mockDigest = jest.fn().mockReturnValue("mockedHash123");

jest.mock("crypto", () => ({
  createHash: jest.fn(() => ({
    update: mockUpdate,
    digest: mockDigest,
  })),
}));

describe("Tree", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    crypto.createHash.mockImplementation(() => ({
      update: mockUpdate,
      digest: mockDigest,
    }));
  });

  describe("constructor", () => {
    it("should create a tree with correct properties", () => {
      const tree = new Tree();
      expect(tree.type).toBe("tree");
      expect(tree.entries).toBeInstanceOf(Map);
      expect(tree.entries.size).toBe(0);
    });
  });

  describe("addEntry", () => {
    it("should add file entry with default mode", () => {
      const tree = new Tree();
      tree.addEntry("test.txt", "hash123");

      const entry = tree.entries.get("test.txt");
      expect(entry).toBeDefined();
      expect(entry.hash).toBe("hash123");
      expect(entry.mode).toBe("100644");
    });
  });

  describe("serialize", () => {
    it("should serialize entries in correct format", () => {
      const tree = new Tree();
      tree.addEntry("test.txt", "hash123", "100644");
      tree.addEntry("src", "hash456", "040000");

      const serialized = tree.serialize();
      expect(serialized).toContain("100644 blob hash123\ttest.txt");
      expect(serialized).toContain("040000 tree hash456\tsrc");
    });
  });

  describe("calculateHash", () => {
    it("should calculate hash with correct format", () => {
      const tree = new Tree();
      tree.addEntry("test.txt", "hash123");

      const expectedHash = `tree ${
        tree.serialize().length
      }\0${tree.serialize()}`;
      tree.calculateHash();

      expect(crypto.createHash).toHaveBeenCalledWith("sha1");
      expect(mockUpdate).toHaveBeenCalledWith(expectedHash);
      expect(mockDigest).toHaveBeenCalledWith("hex");
    });
  });
});
