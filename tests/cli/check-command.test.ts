import { describe, expect, it } from "vitest";
import { runCli } from "../helpers/cli.js";
import { makeProject } from "../helpers/tmp.js";

describe("motionforge check", () => {
  it("exits 1 on errors and prints a JSON report on request", async () => {
    const bad = await makeProject({ "index.html": '<img src="https://x.test/a.jpg">' });

    const run = await runCli(["check", bad, "--json"]);

    expect(run.exitCode).toBe(1);
    expect((JSON.parse(run.stdout) as { errors: number }).errors).toBe(1);
  });

  it("exits 0 when there are only warnings", async () => {
    const warnOnly = await makeProject({ "index.html": `<div class="scene"><h1>x</h1></div>` });

    const run = await runCli(["check", warnOnly]);

    expect(run.exitCode).toBeUndefined();
    expect(run.stdout).toMatch(/0 error\(s\), 2 warning\(s\)/);
  });

  it("rejects an invalid --max-primitive-ratio", async () => {
    const dir = await makeProject({ "index.html": "<p>x</p>" });
    await expect(runCli(["check", dir, "--max-primitive-ratio", "3"])).rejects.toThrow(
      /between 0 and 1/,
    );
  });
});
