import path from "node:path";
import { describe, expect, it } from "vitest";
import { runCli } from "../helpers/cli.js";
import { makeTempDir } from "../helpers/tmp.js";

async function env() {
  const cwd = await makeTempDir();
  const homeDir = await makeTempDir();
  const now = () => new Date("2026-10-16T10:00:00.000Z");
  return { cwd, homeDir, now };
}

describe("motionforge memory", () => {
  it("adds, searches, lists and forgets lessons across project and global scope", async () => {
    const ctx = await env();

    const added = await runCli(
      [
        "memory",
        "add",
        "Photo plus kinetic title",
        "--kind",
        "approved",
        "--scene-type",
        "opening",
        "--tags",
        "photo,title",
        "--reason",
        "reads fast",
      ],
      ctx,
    );
    const id = /Saved (l_[0-9a-f]+) \(project\)/.exec(added.stdout)?.[1] ?? "";
    expect(id).not.toBe("");
    await runCli(
      ["memory", "add", "Always use grain", "--kind", "note", "--tags", "texture", "--global"],
      ctx,
    );

    const found = await runCli(["memory", "search", "photo", "--json"], ctx);
    expect(
      (JSON.parse(found.stdout) as { lesson: { id: string }; score: number }[]).map(
        (s) => s.lesson.id,
      ),
    ).toEqual([id]);

    const listed = await runCli(["memory", "list"], ctx);
    expect(listed.stdout).toContain("Always use grain");
    expect(listed.stdout).toContain("Photo plus kinetic title");

    const onlyGlobal = await runCli(["memory", "list", "--global", "--json"], ctx);
    expect(JSON.parse(onlyGlobal.stdout)).toHaveLength(1);

    const forgot = await runCli(["memory", "forget", id], ctx);
    expect(forgot.stdout).toContain("Forgot");
    expect((await runCli(["memory", "search", "photo"], ctx)).stdout).toBe("No lessons found.\n");
  });

  it("rejects an unknown kind with the allowed values", async () => {
    const ctx = await env();
    await expect(runCli(["memory", "add", "x", "--kind", "loved"], ctx)).rejects.toThrow(
      /approved, rejected, edited, note/,
    );
  });

  it("keeps global memory out of the project folder", async () => {
    const ctx = await env();
    await runCli(["memory", "add", "g", "--kind", "note", "--global"], ctx);
    const { readFile } = await import("node:fs/promises");
    expect(
      await readFile(path.join(ctx.homeDir, ".motionforge", "memoria", "licoes.jsonl"), "utf8"),
    ).toContain('"scope":"global"');
    await expect(
      readFile(path.join(ctx.cwd, ".motionforge", "memoria", "licoes.jsonl"), "utf8"),
    ).rejects.toThrow();
  });
});
