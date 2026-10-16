import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach } from "vitest";

const created: string[] = [];

afterEach(async () => {
  await Promise.all(created.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

export async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), "reelcraft-test-"));
  created.push(dir);
  return dir;
}

/** Writes files (relative path -> content) under a fresh temp dir and returns the dir. */
export async function makeProject(files: Record<string, string>): Promise<string> {
  const dir = await makeTempDir();
  for (const [rel, content] of Object.entries(files)) {
    const target = path.join(dir, ...rel.split("/"));
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, content);
  }
  return dir;
}
