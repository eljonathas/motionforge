import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { ReelcraftError } from "../core/errors.js";
import { pathExists } from "../core/fs-utils.js";
import { LessonSchema, type Lesson, type LessonScope, type NewLesson } from "./types.js";

export interface MemoryLocation {
  /** Project root, used for the "project" scope. */
  projectDir: string;
  /** Home directory, used for the "global" scope. */
  homeDir?: string | undefined;
}

const MEMORY_SEGMENTS = [".reelcraft", "memoria", "licoes.jsonl"] as const;

export function memoryFile(scope: LessonScope, location: MemoryLocation): string {
  const base = scope === "global" ? (location.homeDir ?? homedir()) : location.projectDir;
  return path.join(base, ...MEMORY_SEGMENTS);
}

export async function readLessons(file: string): Promise<Lesson[]> {
  if (!(await pathExists(file))) return [];
  const lines = (await readFile(file, "utf8")).split(/\r?\n/);
  const lessons: Lesson[] = [];
  lines.forEach((line, index) => {
    if (line.trim() === "") return;
    try {
      lessons.push(LessonSchema.parse(JSON.parse(line)));
    } catch (error) {
      throw new ReelcraftError(
        `${file} line ${index + 1} is not a valid lesson: ${(error as Error).message.split("\n")[0] ?? ""}`,
        "Fix or delete that line; each line must be one JSON lesson.",
      );
    }
  });
  return lessons;
}

async function writeAtomically(file: string, lessons: readonly Lesson[]): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.tmp`;
  await writeFile(
    temp,
    lessons.map((l) => JSON.stringify(l)).join("\n") + (lessons.length ? "\n" : ""),
    "utf8",
  );
  await rename(temp, file);
}

function newId(createdAt: string, lesson: NewLesson, taken: ReadonlySet<string>): string {
  const digest = createHash("sha256")
    .update(`${createdAt}|${lesson.kind}|${lesson.decision}`)
    .digest("hex");
  for (let length = 8; length <= digest.length; length++) {
    const id = `l_${digest.slice(0, length)}`;
    if (!taken.has(id)) return id;
  }
  throw new ReelcraftError("Could not generate a unique lesson id.");
}

export interface AddContext extends MemoryLocation {
  scope: LessonScope;
  now: () => Date;
}

export async function addLesson(lesson: NewLesson, ctx: AddContext): Promise<Lesson> {
  if (lesson.decision.trim() === "") {
    throw new ReelcraftError(
      "A lesson needs a decision.",
      "Say what was chosen, rejected or changed.",
    );
  }
  const file = memoryFile(ctx.scope, ctx);
  const existing = await readLessons(file);
  const createdAt = ctx.now().toISOString();
  const record: Lesson = {
    id: newId(createdAt, lesson, new Set(existing.map((l) => l.id))),
    created_at: createdAt,
    scope: ctx.scope,
    kind: lesson.kind,
    scene_type: lesson.scene_type ?? "",
    tags: [...new Set((lesson.tags ?? []).map((t) => t.trim()).filter(Boolean))],
    decision: lesson.decision.trim(),
    reason: lesson.reason ?? "",
    evidence: lesson.evidence ?? "",
    source: lesson.source ?? "",
  };
  await writeAtomically(file, [...existing, record]);
  return record;
}

/** Removes a lesson by id from the given scopes; returns the removed lesson. */
export async function forgetLesson(
  id: string,
  scopes: readonly LessonScope[],
  location: MemoryLocation,
): Promise<Lesson> {
  for (const scope of scopes) {
    const file = memoryFile(scope, location);
    const lessons = await readLessons(file);
    const found = lessons.find((l) => l.id === id);
    if (!found) continue;
    await writeAtomically(
      file,
      lessons.filter((l) => l.id !== id),
    );
    return found;
  }
  throw new ReelcraftError(
    `No lesson with id ${id}.`,
    "List lessons with `reelcraft memory list` to see their ids.",
  );
}

export async function loadLessons(
  scopes: readonly LessonScope[],
  location: MemoryLocation,
): Promise<Lesson[]> {
  const all = await Promise.all(scopes.map((scope) => readLessons(memoryFile(scope, location))));
  return all.flat();
}
