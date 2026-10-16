import { mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import { checkProject } from "../check/run.js";
import { ReelcraftError } from "../core/errors.js";
import { isDirectory, toPosix } from "../core/fs-utils.js";
import { runHyperframes, tailOutput } from "../core/hyperframes.js";

/** Rules whose errors make a render untrustworthy (licences, offline determinism). */
const BLOCKING_RULES = new Set([
  "license-missing",
  "license-restricted",
  "remote-url",
  "missing-file",
  "ledger-invalid",
]);

async function requireProject(dir: string): Promise<string> {
  const root = path.resolve(dir);
  if (!(await isDirectory(root))) throw new ReelcraftError(`Project directory not found: ${root}`);
  return root;
}

export interface SnapshotOptions {
  dir: string;
  frames?: number | undefined;
  at?: string | undefined;
  now: () => Date;
}

export async function snapshotProject(
  options: SnapshotOptions,
): Promise<{ output: string; images: string[] }> {
  const root = await requireProject(options.dir);
  const stamp = options.now().toISOString().replace(/[:.]/g, "-");
  const outDir = path.join(root, ".hyperframes", "snapshots", stamp);
  await mkdir(outDir, { recursive: true });
  const args = ["snapshot", ".", "-o", outDir];
  if (options.at) args.push("--at", options.at);
  else if (options.frames !== undefined) args.push("--frames", String(options.frames));
  const result = await runHyperframes(args, root);
  if (result.code !== 0) {
    throw new ReelcraftError(
      `hyperframes snapshot failed (exit ${result.code}).\n${tailOutput(result)}`,
      "Run `reelcraft check` and fix the composition, then try again.",
    );
  }
  const images = (await readdir(outDir))
    .filter((f) => f.endsWith(".png"))
    .sort()
    .map((f) => toPosix(path.join(outDir, f)));
  return { output: toPosix(outDir), images };
}

export interface RenderOptions {
  dir: string;
  output?: string | undefined;
  quality?: string | undefined;
  fps?: number | undefined;
  /** Render even when the licence/offline checks report errors. */
  force?: boolean | undefined;
}

async function assertRenderable(root: string): Promise<void> {
  const report = await checkProject(root);
  const blocking = report.findings.filter(
    (f) => f.severity === "error" && BLOCKING_RULES.has(f.rule),
  );
  if (blocking.length === 0) return;
  const list = blocking
    .slice(0, 5)
    .map((f) => `- ${f.file}: ${f.message}`)
    .join("\n");
  const more = blocking.length > 5 ? `\n...and ${blocking.length - 5} more.` : "";
  throw new ReelcraftError(
    `Refusing to render: ${blocking.length} licence or offline problem(s).\n${list}${more}`,
    "Fix them (see `check`), or pass force: true if you accept the risk.",
  );
}

export async function renderProject(
  options: RenderOptions,
): Promise<{ output: string; log: string }> {
  const root = await requireProject(options.dir);
  if (!options.force) await assertRenderable(root);
  const output = options.output ?? path.join("renders", `${path.basename(root)}.mp4`);
  const args = ["render", ".", "-o", output, "--quiet"];
  if (options.quality) args.push("--quality", options.quality);
  if (options.fps !== undefined) args.push("--fps", String(options.fps));
  const result = await runHyperframes(args, root);
  if (result.code !== 0) {
    throw new ReelcraftError(
      `hyperframes render failed (exit ${result.code}).\n${tailOutput(result)}`,
      "Run `check` and `snapshot` to find the broken scene.",
    );
  }
  return { output: toPosix(path.resolve(root, output)), log: tailOutput(result, 5) };
}
