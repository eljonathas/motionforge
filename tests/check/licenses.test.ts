import { describe, expect, it } from "vitest";
import { checkLicenses, type LicenseCheckInput } from "../../src/check/licenses.js";
import type { AssetRef } from "../../src/check/refs.js";
import type { LedgerEntry } from "../../src/assets/ledger.js";

function entry(file: string, license = "CC0 1.0"): LedgerEntry {
  return {
    file,
    provider: "test",
    id: "1",
    title: "t",
    author: "a",
    author_url: "",
    source_url: "",
    license,
    license_url: "",
    attribution_required: false,
    attribution_text: "",
    downloaded_at: "",
  };
}

const ref = (url: string, kind: AssetRef["kind"] = "img"): AssetRef => ({
  url,
  kind,
  selector: "img",
  line: 3,
});

function run(partial: Partial<LicenseCheckInput>) {
  return checkLicenses({
    ledger: [],
    assetFiles: [],
    documents: [],
    fileExists: () => true,
    ...partial,
  });
}

describe("checkLicenses", () => {
  it("errors on a referenced local file without a ledger entry, naming file and selector", () => {
    const findings = run({
      documents: [{ file: "index.html", refs: [ref("assets/photo/a.jpg")] }],
    });
    expect(findings).toEqual([
      expect.objectContaining({
        rule: "license-missing",
        severity: "error",
        file: "index.html",
        selector: "img",
        line: 3,
      }),
    ]);
  });

  it("accepts licensed files, resolving paths relative to the composition", () => {
    const findings = run({
      ledger: [entry("assets/photo/a.jpg")],
      documents: [{ file: "compositions/intro.html", refs: [ref("../assets/photo/a.jpg")] }],
    });
    expect(findings).toEqual([]);
  });

  it("covers video, audio, css url() and lottie references", () => {
    const refs = [
      ref("assets/v.mp4", "video"),
      ref("assets/a.mp3", "audio"),
      ref("assets/t.png", "css-url"),
      ref("assets/l.json", "lottie"),
    ];
    const findings = run({ documents: [{ file: "index.html", refs }] });
    expect(findings).toHaveLength(4);
  });

  it("ignores remote, data and fragment references (the network check owns remote URLs)", () => {
    const refs = [
      ref("https://x.test/a.jpg"),
      ref("data:image/png;base64,AAA"),
      ref("#grad", "css-url"),
    ];
    expect(run({ documents: [{ file: "index.html", refs }] })).toEqual([]);
  });

  it("errors on assets present in assets/ but absent from the ledger and unreferenced", () => {
    const findings = run({
      assetFiles: ["assets/photo/orphan.jpg"],
      ledger: [entry("assets/photo/ok.jpg")],
    });
    expect(findings).toEqual([
      expect.objectContaining({ rule: "license-missing", file: "assets/photo/orphan.jpg" }),
    ]);
  });

  it("does not report the same unlicensed asset twice when it is referenced", () => {
    const findings = run({
      assetFiles: ["assets/photo/a.jpg"],
      documents: [{ file: "index.html", refs: [ref("assets/photo/a.jpg")] }],
    });
    expect(findings).toHaveLength(1);
  });

  it("flags NC and ND licences: error when used, warning when only listed", () => {
    const ledger = [
      entry("assets/photo/nc.jpg", "CC BY-NC 4.0"),
      entry("assets/photo/nd.jpg", "CC BY-ND 2.0"),
      entry("assets/photo/ok.jpg", "CC BY-SA 4.0"),
    ];
    const findings = run({
      ledger,
      documents: [{ file: "index.html", refs: [ref("assets/photo/nc.jpg")] }],
    });

    const byFile = Object.fromEntries(findings.map((f) => [f.selector, f.severity]));
    expect(byFile).toEqual({ "assets/photo/nc.jpg": "error", "assets/photo/nd.jpg": "warning" });
    expect(findings.every((f) => f.rule === "license-restricted")).toBe(true);
  });

  it("reports references to files that do not exist", () => {
    const findings = run({
      ledger: [entry("assets/photo/a.jpg")],
      documents: [{ file: "index.html", refs: [ref("assets/photo/a.jpg")] }],
      fileExists: () => false,
    });
    expect(findings.map((f) => f.rule).sort()).toEqual(["ledger-stale", "missing-file"]);
  });
});
