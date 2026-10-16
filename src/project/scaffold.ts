import { copyFile, mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import { ReelcraftError } from "../core/errors.js";
import { pathExists, writeJson, writeText } from "../core/fs-utils.js";
import { runHyperframes, tailOutput } from "../core/hyperframes.js";
import { findPackageDir } from "../core/packages.js";
import { vendorProject, type VendorReport } from "../vendor/vendor.js";
import { parseResolution, type Resolution } from "./resolution.js";
import { BRIEF_TEMPLATE } from "./templates.js";

export interface NewProjectOptions {
  name: string;
  resolution?: string | undefined;
  /** Directory the project folder is created in. Defaults to the current directory. */
  cwd?: string | undefined;
}

export interface NewProjectResult {
  projectDir: string;
  resolution: Resolution;
  vendor: VendorReport;
  created: string[];
}

async function assertTargetFree(target: string): Promise<void> {
  if (!(await pathExists(target))) return;
  const entries = await readdir(target);
  if (entries.length > 0) {
    throw new ReelcraftError(
      `The folder ${target} already exists and is not empty.`,
      "Pick another project name or remove the folder.",
    );
  }
}

async function initHyperframes(projectDir: string, resolution: Resolution): Promise<void> {
  const parent = path.dirname(projectDir);
  await mkdir(parent, { recursive: true });
  const result = await runHyperframes(
    [
      "init",
      path.basename(projectDir),
      "--example",
      "blank",
      "--non-interactive",
      "--resolution",
      resolution,
    ],
    parent,
  );
  if (result.code !== 0 || !(await pathExists(path.join(projectDir, "index.html")))) {
    throw new ReelcraftError(
      `hyperframes init failed (exit ${result.code}).\n${tailOutput(result)}`,
      "Check that Node 22+ is installed and the folder is writable.",
    );
  }
}

async function ensureGsapVendored(projectDir: string): Promise<void> {
  const target = path.join(projectDir, "vendor", "gsap.min.js");
  if (await pathExists(target)) return;
  await mkdir(path.dirname(target), { recursive: true });
  await copyFile(path.join(findPackageDir("gsap"), "dist", "gsap.min.js"), target);
}

async function writeReelcraftFiles(projectDir: string): Promise<string[]> {
  await writeJson(path.join(projectDir, "assets", "LICENCAS.json"), []);
  await writeText(path.join(projectDir, ".reelcraft", "memoria", ".gitkeep"), "");
  const brief = path.join(projectDir, "brief.md");
  if (!(await pathExists(brief))) await writeText(brief, BRIEF_TEMPLATE);
  return ["assets/LICENCAS.json", ".reelcraft/memoria/", "brief.md", "vendor/gsap.min.js"];
}

/** Scaffolds a HyperFrames project that renders offline and carries Reelcraft's bookkeeping files. */
export async function createProject(options: NewProjectOptions): Promise<NewProjectResult> {
  if (options.name.trim() === "") throw new ReelcraftError("A project name is required.");
  const resolution = parseResolution(options.resolution);
  const projectDir = path.resolve(options.cwd ?? process.cwd(), options.name);
  await assertTargetFree(projectDir);
  await initHyperframes(projectDir, resolution);
  await ensureGsapVendored(projectDir);
  const vendor = await vendorProject(projectDir);
  const created = await writeReelcraftFiles(projectDir);
  return { projectDir, resolution, vendor, created };
}
