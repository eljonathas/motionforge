import path from "node:path";
import { z } from "zod";
import { getAsset } from "../assets/get.js";
import { formatCandidates, formatDownload } from "../assets/format.js";
import { parseKind, searchAssets } from "../assets/registry.js";
import { ASSET_KINDS } from "../assets/types.js";
import { checkProject } from "../check/run.js";
import type { Context } from "../context.js";
import { createProject } from "../project/scaffold.js";
import { RESOLUTIONS } from "../project/resolution.js";
import { addLesson, loadLessons } from "../memory/store.js";
import { searchLessons } from "../memory/search.js";
import { LESSON_KINDS, LESSON_SCOPES } from "../memory/types.js";
import { vendorProject } from "../vendor/vendor.js";
import { renderProject, snapshotProject } from "./hyperframes-tools.js";

export interface ToolSpec {
  name: string;
  description: string;
  inputSchema: z.ZodRawShape;
  run: (input: Record<string, unknown>, ctx: Context) => Promise<unknown>;
}

const dir = z
  .string()
  .optional()
  .describe("Project directory. Defaults to the server's working directory.");

function projectPath(ctx: Context, value: unknown): string {
  return path.resolve(ctx.cwd, typeof value === "string" ? value : ".");
}

function define<S extends z.ZodRawShape>(
  name: string,
  description: string,
  inputSchema: S,
  run: (input: z.infer<z.ZodObject<S>>, ctx: Context) => Promise<unknown>,
): ToolSpec {
  const schema = z.object(inputSchema);
  return { name, description, inputSchema, run: (input, ctx) => run(schema.parse(input), ctx) };
}

export const TOOLS: readonly ToolSpec[] = [
  define(
    "project_new",
    "Create a HyperFrames project that renders offline (GSAP vendored), with assets/LICENCAS.json, brief.md and a memory folder.",
    {
      name: z.string().min(1).describe("Folder name of the new project."),
      resolution: z.enum(RESOLUTIONS).optional(),
      parent_dir: z
        .string()
        .optional()
        .describe("Where to create it. Defaults to the working directory."),
    },
    async (input, ctx) =>
      createProject({
        name: input.name,
        resolution: input.resolution,
        cwd: projectPath(ctx, input.parent_dir),
      }),
  ),
  define(
    "vendor",
    "Replace CDN script/style references (jsdelivr, unpkg, cdnjs) with local copies in vendor/. Reports the ones that cannot be vendored.",
    { dir },
    async (input, ctx) => vendorProject(projectPath(ctx, input.dir)),
  ),
  define(
    "check",
    "Static checks: asset licences (NC/ND flagged), remote URLs, and the primitive-aesthetic detector. Does not duplicate HyperFrames' layout/contrast checks.",
    { dir, max_primitive_ratio: z.number().min(0).max(1).optional() },
    async (input, ctx) =>
      checkProject(
        projectPath(ctx, input.dir),
        input.max_primitive_ratio === undefined
          ? {}
          : { maxPrimitiveRatio: input.max_primitive_ratio },
      ),
  ),
  define(
    "assets_search",
    "Search licensed assets (Openverse, Poly Haven, Pexels). Returns candidates with licence; pass the provider:id to assets_get.",
    {
      kind: z.enum(ASSET_KINDS),
      q: z.string().min(1),
      provider: z.string().optional(),
      limit: z.number().int().min(1).max(30).optional(),
      any_license: z
        .boolean()
        .optional()
        .describe("Openverse only: include licences that forbid commercial use or modification."),
    },
    async (input, ctx) => {
      const { results, problems } = await searchAssets(ctx.registry, {
        kind: parseKind(input.kind),
        q: input.q,
        provider: input.provider,
        limit: input.limit,
        anyLicense: input.any_license ?? false,
      });
      return { results, problems, text: formatCandidates(results) };
    },
  ),
  define(
    "assets_get",
    "Download an asset by provider:id into assets/<kind>/ and record its licence in assets/LICENCAS.json.",
    { ref: z.string().min(1).describe("provider:id, for example pexels:1234567"), dir },
    async (input, ctx) => {
      const result = await getAsset(projectPath(ctx, input.dir), input.ref, ctx);
      return { entries: result.entries, text: formatDownload(result) };
    },
  ),
  define(
    "memory_add",
    "Record a lesson: what was approved, rejected or edited and why. Search it before deciding on a new scene.",
    {
      kind: z.enum(LESSON_KINDS),
      decision: z.string().min(1),
      scene_type: z.string().optional(),
      tags: z.array(z.string()).optional(),
      reason: z.string().optional(),
      evidence: z.string().optional(),
      source: z.string().optional(),
      scope: z.enum(LESSON_SCOPES).optional(),
      dir,
    },
    async (input, ctx) =>
      addLesson(input, {
        scope: input.scope ?? "project",
        projectDir: projectPath(ctx, input.dir),
        homeDir: ctx.homeDir,
        now: ctx.now,
      }),
  ),
  define(
    "memory_search",
    "Search saved lessons (project and global) by keywords, tags and scene type. Deterministic keyword scoring.",
    {
      text: z.string().optional(),
      tags: z.array(z.string()).optional(),
      scene_type: z.string().optional(),
      kind: z.enum(LESSON_KINDS).optional(),
      limit: z.number().int().min(1).max(50).optional(),
      dir,
    },
    async (input, ctx) => {
      const lessons = await loadLessons(LESSON_SCOPES, {
        projectDir: projectPath(ctx, input.dir),
        homeDir: ctx.homeDir,
      });
      return searchLessons(lessons, {
        text: input.text,
        tags: input.tags,
        sceneType: input.scene_type,
        kind: input.kind,
        limit: input.limit ?? 10,
      });
    },
  ),
  define(
    "snapshot",
    "Capture PNG frames of the composition with `hyperframes snapshot` so you can look at them. Returns the file paths.",
    {
      dir,
      frames: z.number().int().min(1).max(30).optional(),
      at: z.string().optional().describe("Comma-separated seconds, e.g. 0.5,3,7."),
    },
    async (input, ctx) =>
      snapshotProject({
        dir: projectPath(ctx, input.dir),
        frames: input.frames,
        at: input.at,
        now: ctx.now,
      }),
  ),
  define(
    "render",
    "Render the project to MP4 with `hyperframes render`. Refuses to render when licence or offline checks fail unless force is true.",
    {
      dir,
      output: z.string().optional(),
      quality: z.enum(["draft", "looks", "delivery", "standard", "high"]).optional(),
      fps: z.number().int().min(1).max(240).optional(),
      force: z.boolean().optional(),
    },
    async (input, ctx) => renderProject({ ...input, dir: projectPath(ctx, input.dir) }),
  ),
];
