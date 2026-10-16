import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ReelcraftError } from "./errors.js";

/** Finds an installed dependency by walking up node_modules from this module (hoisting-safe). */
export function findPackageDir(name: string): string {
  let dir = path.dirname(fileURLToPath(import.meta.url));
  for (;;) {
    const candidate = path.join(dir, "node_modules", ...name.split("/"));
    if (existsSync(path.join(candidate, "package.json"))) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new ReelcraftError(
    `Dependency "${name}" was not found next to reelcraft.`,
    "Reinstall reelcraft (npm install) so its dependencies are present.",
  );
}

/** Version of reelcraft itself, read from the package.json that sits above this module. */
export async function ownVersion(): Promise<string> {
  let dir = path.dirname(fileURLToPath(import.meta.url));
  for (;;) {
    const file = path.join(dir, "package.json");
    if (existsSync(file)) {
      const parsed = JSON.parse(await readFile(file, "utf8")) as {
        name?: string;
        version?: string;
      };
      if (parsed.name === "reelcraft") return parsed.version ?? "0.0.0";
    }
    const parent = path.dirname(dir);
    if (parent === dir) return "0.0.0";
    dir = parent;
  }
}
