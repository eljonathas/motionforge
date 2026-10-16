import { readFile } from "node:fs/promises";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { checkProject } from "../../src/check/run.js";
import { findPackageDir } from "../../src/core/packages.js";
import { createProject } from "../../src/project/scaffold.js";
import { runCli } from "../helpers/cli.js";
import { makeTempDir } from "../helpers/tmp.js";

beforeAll(() => {
  process.env["HYPERFRAMES_SKIP_SKILLS"] = "1";
});

describe("createProject", () => {
  it("scaffolds a HyperFrames project with GSAP vendored and MotionForge bookkeeping", async () => {
    const cwd = await makeTempDir();

    const result = await createProject({ name: "demo", cwd });

    const read = (rel: string) => readFile(path.join(result.projectDir, rel), "utf8");
    const html = await read("index.html");
    expect(html).toContain('<script src="./vendor/gsap.min.js"></script>');
    expect(html).not.toMatch(/https?:\/\//);
    expect(await read("vendor/gsap.min.js")).toBe(
      await readFile(path.join(findPackageDir("gsap"), "dist", "gsap.min.js"), "utf8"),
    );
    expect(JSON.parse(await read("assets/LICENCAS.json"))).toEqual([]);
    expect(await read(".motionforge/memoria/.gitkeep")).toBe("");
    expect(await read("brief.md")).toMatch(
      /## Pedido[\s\S]*## Público e plataforma[\s\S]*## Duração[\s\S]*## Tom[\s\S]*## Restrições/,
    );
    expect((await checkProject(result.projectDir)).errors).toBe(0);
  });

  it("passes the resolution preset to HyperFrames", async () => {
    const cwd = await makeTempDir();
    const result = await createProject({ name: "tall", resolution: "portrait", cwd });
    expect(await readFile(path.join(result.projectDir, "index.html"), "utf8")).toContain(
      'data-height="1920"',
    );
  });

  it("refuses an unknown resolution and a non-empty target folder", async () => {
    const cwd = await makeTempDir();
    await expect(createProject({ name: "x", resolution: "cinema", cwd })).rejects.toThrow(
      /landscape, portrait, square/,
    );
    await createProject({ name: "taken", cwd });
    await expect(createProject({ name: "taken", cwd })).rejects.toThrow(
      /already exists and is not empty/,
    );
  });

  it("is available as `motionforge new`", async () => {
    const cwd = await makeTempDir();
    const run = await runCli(["new", "viacli", "--resolution", "square"], { cwd });
    expect(run.stdout).toContain("(square)");
    expect(await readFile(path.join(cwd, "viacli", "brief.md"), "utf8")).toContain("# Brief");
  });
});
