import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

/** Converts a native path to the forward-slash form used in ledgers and reports. */
export function toPosix(p: string): string {
  return p.split(path.sep).join("/");
}

export async function pathExists(p: string): Promise<boolean> {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

export async function isDirectory(p: string): Promise<boolean> {
  try {
    return (await stat(p)).isDirectory();
  } catch {
    return false;
  }
}

export async function readText(p: string): Promise<string> {
  return readFile(p, "utf8");
}

export async function writeText(p: string, content: string): Promise<void> {
  await mkdir(path.dirname(p), { recursive: true });
  await writeFile(p, content, "utf8");
}

export async function readJsonIfExists(p: string): Promise<unknown> {
  if (!(await pathExists(p))) return undefined;
  const raw = await readText(p);
  return JSON.parse(raw) as unknown;
}

export async function writeJson(p: string, value: unknown): Promise<void> {
  await writeText(p, `${JSON.stringify(value, null, 2)}\n`);
}

const DEFAULT_IGNORED_DIRS = new Set([
  "node_modules",
  ".git",
  ".hyperframes",
  ".motionforge",
  "renders",
  "dist",
  "vendor",
]);

export interface WalkOptions {
  ignoreDirs?: ReadonlySet<string>;
}

/** Lists files under `root` (sorted, absolute paths), skipping tooling directories. */
export async function walkFiles(root: string, options: WalkOptions = {}): Promise<string[]> {
  const ignore = options.ignoreDirs ?? DEFAULT_IGNORED_DIRS;
  const out: string[] = [];
  const entries = await readdir(root, { withFileTypes: true });
  entries.sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) {
      if (!ignore.has(entry.name)) out.push(...(await walkFiles(full, options)));
    } else if (entry.isFile()) {
      out.push(full);
    }
  }
  return out;
}

export async function listHtmlFiles(projectDir: string): Promise<string[]> {
  const files = await walkFiles(projectDir);
  return files.filter((f) => f.toLowerCase().endsWith(".html"));
}
