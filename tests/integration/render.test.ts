import { existsSync, statSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { checkProject } from "../../src/check/run.js";
import { renderProject, snapshotProject } from "../../src/mcp/hyperframes-tools.js";
import { createProject } from "../../src/project/scaffold.js";
import { makeTempDir } from "../helpers/tmp.js";

/**
 * Needs a Chrome that HyperFrames can drive. Run with HYPERFRAMES_BROWSER_PATH pointing at one, for
 * example HYPERFRAMES_BROWSER_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome npm run test:integration.
 * Without it the suite is skipped, so CI machines without Chrome stay green.
 */
const browser = process.env["HYPERFRAMES_BROWSER_PATH"];
const hasBrowser = browser !== undefined && existsSync(browser);

describe.skipIf(!hasBrowser)("render with locally vendored GSAP (integration)", () => {
  it("creates a project, animates with GSAP and renders an MP4 without any remote URL", async () => {
    process.env["HYPERFRAMES_SKIP_SKILLS"] = "1";
    const cwd = await makeTempDir();
    const { projectDir } = await createProject({ name: "offline", cwd });
    const indexPath = path.join(projectDir, "index.html");
    const html = await readFile(indexPath, "utf8");
    await writeFile(
      indexPath,
      html.replace(
        /\/\/ Example:.*\n/,
        'tl.fromTo("#title", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" }, 0.5);\n',
      ),
    );

    const report = await checkProject(projectDir);
    expect(report.findings.filter((f) => f.rule === "remote-url")).toEqual([]);

    const stills = await snapshotProject({
      dir: projectDir,
      at: "0,2",
      now: () => new Date("2026-10-16T10:00:00.000Z"),
    });
    const [hidden, visible] = await Promise.all(
      stills.images.slice(0, 2).map((file) => readFile(file)),
    );
    expect(stills.images.length).toBeGreaterThanOrEqual(2);
    expect(Buffer.compare(hidden ?? Buffer.alloc(0), visible ?? Buffer.alloc(0))).not.toBe(0);

    const rendered = await renderProject({ dir: projectDir, quality: "draft", fps: 10 });
    expect(statSync(rendered.output).size).toBeGreaterThan(1000);
  }, 180_000);
});
