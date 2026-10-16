import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  isRestrictedLicense,
  ledgerPath,
  parseLedger,
  readLedger,
  recordLicense,
} from "../../src/assets/ledger.js";
import { makeProject } from "../helpers/tmp.js";

const entry = (file: string, title = "t") => ({
  file,
  provider: "pexels",
  id: "1",
  title,
  author: "A",
  author_url: "",
  source_url: "",
  license: "Pexels License",
  license_url: "",
  attribution_required: false,
  attribution_text: "",
  downloaded_at: "2026-10-16T00:00:00.000Z",
});

describe("ledger", () => {
  it("appends entries as a JSON list and replaces an earlier entry for the same file", async () => {
    const dir = await makeProject({ "assets/LICENCAS.json": "[]" });

    await recordLicense(dir, entry("assets/photo/a.jpg", "first"));
    await recordLicense(dir, entry("assets\\photo\\b.jpg"));
    await recordLicense(dir, entry("./assets/photo/a.jpg", "second"));

    const stored = JSON.parse(await readFile(ledgerPath(dir), "utf8")) as {
      file: string;
      title: string;
    }[];
    expect(stored.map((e) => [e.file, e.title])).toEqual([
      ["assets/photo/b.jpg", "t"],
      ["assets/photo/a.jpg", "second"],
    ]);
  });

  it("treats a missing ledger as empty and creates it on first write", async () => {
    const dir = await makeProject({});
    expect(await readLedger(dir)).toEqual([]);
    await recordLicense(dir, entry("assets/photo/a.jpg"));
    expect(await readLedger(dir)).toHaveLength(1);
  });

  it("rejects a ledger that is not valid with an actionable message", async () => {
    const dir = await makeProject({ "assets/LICENCAS.json": '[{"file":"a.jpg"}]' });
    await expect(readLedger(dir)).rejects.toThrow(/LICENCAS.json is not valid/);
    expect(() => parseLedger({})).toThrow(/expected array/);
    const broken = await makeProject({ "assets/LICENCAS.json": "{nope" });
    await expect(readLedger(broken)).rejects.toThrow(/not valid JSON/);
  });

  it("recognises NonCommercial and NoDerivatives licences", () => {
    for (const license of ["CC BY-NC 4.0", "by-nd", "CC BY-NC-SA 2.0", "CC BY-NC-ND 4.0"]) {
      expect(isRestrictedLicense(license)).toBe(true);
    }
    for (const license of [
      "CC0 1.0",
      "CC BY 4.0",
      "CC BY-SA 4.0",
      "Pexels License",
      "Public Domain Mark 1.0",
    ]) {
      expect(isRestrictedLicense(license)).toBe(false);
    }
  });
});
