import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  addLesson,
  forgetLesson,
  loadLessons,
  memoryFile,
  readLessons,
} from "../../src/memory/store.js";
import { makeTempDir } from "../helpers/tmp.js";

const now = (iso: string) => () => new Date(iso);

async function locations() {
  return { projectDir: await makeTempDir(), homeDir: await makeTempDir() };
}

describe("memory store", () => {
  it("writes project lessons to .reelcraft/memoria/licoes.jsonl, one JSON object per line", async () => {
    const loc = await locations();

    const lesson = await addLesson(
      {
        kind: "rejected",
        decision: "Flat circles",
        scene_type: "chart",
        tags: ["chart", " chart ", "flat"],
        reason: "primitive look",
        evidence: "frames/3.png",
        source: "user",
      },
      { ...loc, scope: "project", now: now("2026-10-16T10:00:00.000Z") },
    );

    const file = path.join(loc.projectDir, ".reelcraft", "memoria", "licoes.jsonl");
    expect(memoryFile("project", loc)).toBe(file);
    const lines = (await readFile(file, "utf8")).trimEnd().split("\n");
    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0] ?? "")).toEqual({
      id: lesson.id,
      created_at: "2026-10-16T10:00:00.000Z",
      scope: "project",
      kind: "rejected",
      scene_type: "chart",
      tags: ["chart", "flat"],
      decision: "Flat circles",
      reason: "primitive look",
      evidence: "frames/3.png",
      source: "user",
    });
    expect(lesson.id).toMatch(/^l_[0-9a-f]{8}$/);
  });

  it("keeps global lessons under the home directory and merges both scopes on load", async () => {
    const loc = await locations();
    await addLesson(
      { kind: "note", decision: "project one" },
      { ...loc, scope: "project", now: now("2026-10-01T00:00:00.000Z") },
    );
    await addLesson(
      { kind: "note", decision: "global one" },
      { ...loc, scope: "global", now: now("2026-10-02T00:00:00.000Z") },
    );

    expect(memoryFile("global", loc)).toBe(
      path.join(loc.homeDir, ".reelcraft", "memoria", "licoes.jsonl"),
    );
    const all = await loadLessons(["project", "global"], loc);
    expect(all.map((l) => [l.scope, l.decision])).toEqual([
      ["project", "project one"],
      ["global", "global one"],
    ]);
    expect(await loadLessons(["global"], loc)).toHaveLength(1);
  });

  it("produces the same id for the same input and avoids collisions with existing ids", async () => {
    const loc = await locations();
    const ctx = { ...loc, scope: "project" as const, now: now("2026-10-16T10:00:00.000Z") };
    const first = await addLesson({ kind: "note", decision: "same" }, ctx);
    const second = await addLesson({ kind: "note", decision: "same" }, ctx);
    expect(second.id).not.toBe(first.id);
    expect(second.id.startsWith(first.id)).toBe(true);
  });

  it("forgets a lesson by id and leaves the others", async () => {
    const loc = await locations();
    const ctx = { ...loc, scope: "project" as const, now: now("2026-10-16T10:00:00.000Z") };
    const keep = await addLesson({ kind: "note", decision: "keep" }, ctx);
    const drop = await addLesson({ kind: "note", decision: "drop" }, ctx);

    const removed = await forgetLesson(drop.id, ["project", "global"], loc);

    expect(removed.decision).toBe("drop");
    expect((await readLessons(memoryFile("project", loc))).map((l) => l.id)).toEqual([keep.id]);
  });

  it("explains an unknown id, and an empty decision", async () => {
    const loc = await locations();
    await expect(forgetLesson("l_nope", ["project"], loc)).rejects.toThrow(
      /No lesson with id l_nope/,
    );
    await expect(
      addLesson(
        { kind: "note", decision: "  " },
        { ...loc, scope: "project", now: now("2026-10-16T10:00:00.000Z") },
      ),
    ).rejects.toThrow(/needs a decision/);
  });

  it("reports the line of a corrupt entry instead of silently dropping it", async () => {
    const loc = await locations();
    await addLesson(
      { kind: "note", decision: "ok" },
      { ...loc, scope: "project", now: now("2026-10-16T10:00:00.000Z") },
    );
    const file = memoryFile("project", loc);
    await writeFile(file, `${await readFile(file, "utf8")}{"broken":\n`);

    await expect(readLessons(file)).rejects.toThrow(/licoes\.jsonl line 2/);
  });

  it("reads a missing file as no lessons", async () => {
    const loc = await locations();
    expect(await loadLessons(["project", "global"], loc)).toEqual([]);
  });
});
