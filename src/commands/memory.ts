import path from "node:path";
import type { Command } from "commander";
import type { Context } from "../context.js";
import { searchLessons } from "../memory/search.js";
import { addLesson, forgetLesson, loadLessons } from "../memory/store.js";
import { LESSON_KINDS, type Lesson, type LessonKind, type LessonScope } from "../memory/types.js";
import { ReelcraftError } from "../core/errors.js";
import { print } from "./output.js";

interface ScopeOptions {
  global?: boolean;
  local?: boolean;
  dir: string;
}

function scopesFor(opts: ScopeOptions): LessonScope[] {
  if (opts.global) return ["global"];
  if (opts.local) return ["project"];
  return ["project", "global"];
}

function formatLesson(lesson: Lesson, score?: number): string {
  const head = `${lesson.id}  ${lesson.kind}  [${lesson.scope}]${lesson.scene_type ? `  ${lesson.scene_type}` : ""}${score === undefined ? "" : `  score ${score}`}`;
  const lines = [head, `  ${lesson.decision}`];
  if (lesson.reason) lines.push(`  why: ${lesson.reason}`);
  if (lesson.tags.length > 0) lines.push(`  tags: ${lesson.tags.join(", ")}`);
  if (lesson.evidence) lines.push(`  evidence: ${lesson.evidence}`);
  return lines.join("\n");
}

function parseKindOption(value: string): LessonKind {
  if ((LESSON_KINDS as readonly string[]).includes(value)) return value as LessonKind;
  throw new ReelcraftError(
    `Unknown lesson kind "${value}".`,
    `Use one of: ${LESSON_KINDS.join(", ")}.`,
  );
}

function splitTags(value: string): string[] {
  return value
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

type Locate = (opts: ScopeOptions) => { projectDir: string; homeDir: string | undefined };

export function registerMemoryCommands(program: Command, ctx: Context): void {
  const memory = program
    .command("memory")
    .description("Lessons about what worked and what was rejected");
  const locate: Locate = (opts) => ({
    projectDir: path.resolve(ctx.cwd, opts.dir),
    homeDir: ctx.homeDir,
  });
  registerAdd(memory, ctx, locate);
  registerSearch(memory, locate);
  registerList(memory, locate);
  registerForget(memory, locate);
}

function registerAdd(memory: Command, ctx: Context, location: Locate): void {
  memory
    .command("add <decision>")
    .description("Record a lesson (saved in the project unless --global)")
    .requiredOption("--kind <kind>", `one of: ${LESSON_KINDS.join(", ")}`)
    .option("--scene-type <type>", "kind of scene, e.g. opening-title")
    .option("--tags <list>", "comma-separated tags", splitTags)
    .option("--reason <text>", "why")
    .option("--evidence <text>", "frame path or code snippet")
    .option("--source <text>", "who or what recorded it")
    .option("--global", "save in ~/.reelcraft instead of the project")
    .option("--dir <dir>", "project directory", ".")
    .action(
      async (
        decision: string,
        opts: ScopeOptions & {
          kind: string;
          sceneType?: string;
          tags?: string[];
          reason?: string;
          evidence?: string;
          source?: string;
        },
      ) => {
        const lesson = await addLesson(
          {
            kind: parseKindOption(opts.kind),
            decision,
            scene_type: opts.sceneType,
            tags: opts.tags,
            reason: opts.reason,
            evidence: opts.evidence,
            source: opts.source,
          },
          { ...location(opts), scope: opts.global ? "global" : "project", now: ctx.now },
        );
        print(`Saved ${lesson.id} (${lesson.scope}).`);
      },
    );
}

function registerSearch(memory: Command, location: Locate): void {
  memory
    .command("search [text]")
    .description("Find lessons by keywords, tags and scene type")
    .option("--tags <list>", "comma-separated tags", splitTags)
    .option("--scene-type <type>", "kind of scene")
    .option("--kind <kind>", "only this kind")
    .option("--limit <n>", "maximum results", "10")
    .option("--global", "only global lessons")
    .option("--local", "only this project's lessons")
    .option("--dir <dir>", "project directory", ".")
    .option("--json", "print JSON")
    .action(
      async (
        text: string | undefined,
        opts: ScopeOptions & {
          tags?: string[];
          sceneType?: string;
          kind?: string;
          limit: string;
          json?: boolean;
        },
      ) => {
        const lessons = await loadLessons(scopesFor(opts), location(opts));
        const found = searchLessons(lessons, {
          text,
          tags: opts.tags,
          sceneType: opts.sceneType,
          kind: opts.kind ? parseKindOption(opts.kind) : undefined,
          limit: Number(opts.limit),
        });
        print(
          opts.json
            ? JSON.stringify(found, null, 2)
            : found.length
              ? found.map((s) => formatLesson(s.lesson, s.score)).join("\n\n")
              : "No lessons found.",
        );
      },
    );
}

function registerList(memory: Command, location: Locate): void {
  memory
    .command("list")
    .description("List all lessons, newest first")
    .option("--global", "only global lessons")
    .option("--local", "only this project's lessons")
    .option("--dir <dir>", "project directory", ".")
    .option("--json", "print JSON")
    .action(async (opts: ScopeOptions & { json?: boolean }) => {
      const found = searchLessons(await loadLessons(scopesFor(opts), location(opts)), {});
      print(
        opts.json
          ? JSON.stringify(
              found.map((s) => s.lesson),
              null,
              2,
            )
          : found.length
            ? found.map((s) => formatLesson(s.lesson)).join("\n\n")
            : "No lessons yet.",
      );
    });
}

function registerForget(memory: Command, location: Locate): void {
  memory
    .command("forget <id>")
    .description("Remove a lesson")
    .option("--global", "only look in global lessons")
    .option("--local", "only look in this project's lessons")
    .option("--dir <dir>", "project directory", ".")
    .action(async (id: string, opts: ScopeOptions) => {
      const removed = await forgetLesson(id, scopesFor(opts), location(opts));
      print(`Forgot ${removed.id} (${removed.scope}): ${removed.decision}`);
    });
}
