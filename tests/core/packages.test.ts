import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { ownVersion } from "../../src/core/packages.js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

describe("ownVersion", () => {
  it("reads the version of the scoped package, not 0.0.0", async () => {
    const pkg = JSON.parse(await readFile(path.join(root, "package.json"), "utf8")) as {
      version: string;
    };

    expect(await ownVersion()).toBe(pkg.version);
  });
});
