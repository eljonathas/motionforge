import { describe, expect, it } from "vitest";
import { checkProject, formatCheckReport } from "../../src/check/run.js";
import { makeProject } from "../helpers/tmp.js";

const ledgerEntry = (file: string, license: string) => ({
  file,
  provider: "openverse",
  id: "1",
  title: "t",
  author: "a",
  author_url: "",
  source_url: "",
  license,
  license_url: "",
  attribution_required: true,
  attribution_text: "",
  downloaded_at: "",
});

const GOOD = `<style>body{background:linear-gradient(#123,#456)}</style><div class="scene"><img src="assets/photo/ok.jpg"></div>`;

describe("checkProject", () => {
  it("passes a clean, licensed, offline project", async () => {
    const dir = await makeProject({
      "index.html": GOOD,
      "assets/photo/ok.jpg": "x",
      "assets/LICENCAS.json": JSON.stringify([ledgerEntry("assets/photo/ok.jpg", "CC BY 4.0")]),
    });
    const report = await checkProject(dir);
    expect(report).toMatchObject({ filesChecked: 1, errors: 0, warnings: 0, findings: [] });
  });

  it("collects errors across rules, sorted by file and line", async () => {
    const dir = await makeProject({
      "index.html": `${GOOD}<script src="https://cdn.jsdelivr.net/npm/gsap@3/dist/gsap.min.js"></script>`,
      "assets/photo/ok.jpg": "x",
      "assets/photo/stray.jpg": "x",
      "assets/LICENCAS.json": JSON.stringify([ledgerEntry("assets/photo/ok.jpg", "CC BY-NC 4.0")]),
      "node_modules/pkg/index.html": "<div></div>",
    });
    const report = await checkProject(dir);

    expect(report.findings.map((f) => [f.file, f.rule])).toEqual([
      ["assets/LICENCAS.json", "license-restricted"],
      ["assets/photo/stray.jpg", "license-missing"],
      ["index.html", "remote-url"],
    ]);
    expect(report.errors).toBe(3);
    expect(formatCheckReport(report)).toMatch(/3 error\(s\)/);
  });

  it("reports an invalid ledger as a finding instead of crashing", async () => {
    const dir = await makeProject({ "index.html": GOOD, "assets/LICENCAS.json": "{bad" });
    const report = await checkProject(dir);
    expect(report.findings.some((f) => f.rule === "ledger-invalid")).toBe(true);
  });

  it("honours a custom primitive ratio", async () => {
    const dots = '<div style="border-radius:50%;background:red"></div>'.repeat(3);
    const dir = await makeProject({
      "index.html": `<style>body{background:linear-gradient(#123,#456)}</style><div class="scene"><img src="a.jpg">${dots}</div>`,
      "assets/LICENCAS.json": JSON.stringify([ledgerEntry("a.jpg", "CC0 1.0")]),
      "a.jpg": "x",
    });
    expect((await checkProject(dir)).findings.map((f) => f.rule)).toContain("primitive-ratio");
    expect((await checkProject(dir, { maxPrimitiveRatio: 0.9 })).findings).toEqual([]);
  });

  it("fails clearly when the directory does not exist", async () => {
    await expect(checkProject("/definitely/not/here")).rejects.toThrow(/not found/);
  });
});
