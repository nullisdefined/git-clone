const { Blob } = require("../src/objects/blob");
const crypto = require("crypto");

const mockUpdate = jest.fn().mockReturnThis();
const mockDigest = jest.fn().mockReturnValue("mockedHash123");

jest.mock("crypto", () => ({
  createHash: jest.fn(() => ({
    update: mockUpdate,
    digest: mockDigest,
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

describe("Blob", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    crypto.createHash.mockImplementation(() => ({
      update: mockUpdate,
      digest: mockDigest,
    }));
  });

  describe("constructor", () => {
    it("should create a blob with correct properties", () => {
      const content = "test content";
      const blob = new Blob(content);

      expect(blob.type).toBe("blob");
      expect(blob.content).toBe(content);
      expect(blob.hash).toBe("mockedHash123");
    });
  });

  describe("calculateHash", () => {
    it("should calculate correct SHA1 hash", () => {
      const content = "test content";
      const blob = new Blob(content);
      const expectedData = `blob ${content.length}\0${content}`;

      expect(crypto.createHash).toHaveBeenCalledWith("sha1");
      expect(mockUpdate).toHaveBeenCalledWith(expectedData);
      expect(mockDigest).toHaveBeenCalledWith("hex");
      expect(blob.hash).toBe("mockedHash123");
    });
  });

  describe("save", () => {
    it("should save blob to correct path", async () => {
      const blob = new Blob("test content");
      await blob.save("/test/repo");

      const fs = require("fs");
      expect(fs.promises.mkdir).toHaveBeenCalledWith(
        expect.stringContaining("/test/repo/.pit/objects"),
        expect.any(Object)
      );
      expect(fs.promises.writeFile).toHaveBeenCalledWith(
        expect.stringContaining("/test/repo/.pit/objects"),
        "test content"
      );
    });

    it("should handle save errors", async () => {
      const blob = new Blob("test content");
      const fs = require("fs");
      fs.promises.mkdir.mockRejectedValueOnce(new Error("Save failed"));

      await expect(blob.save("/test/repo")).rejects.toThrow("Save failed");
    });
  });
});
