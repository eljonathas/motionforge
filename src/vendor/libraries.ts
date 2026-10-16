import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { findPackageDir } from "../core/packages.js";
import type { CdnRef } from "./cdn.js";

export interface PlannedCopy {
  /** Absolute path of the file inside the bundled npm package. */
  source: string;
  /** Destination relative to the project root, forward slashes. */
  dest: string;
}

export type LibraryPlan =
  | { kind: "plan"; copies: PlannedCopy[]; entry: string; note?: string }
  | { kind: "unsupported"; reason: string };

interface LibrarySpec {
  pkg: string;
  /** Directory inside the package that holds the browser builds. */
  buildDir: string;
  defaultFile: string;
  /** "major": reject other majors. "minor": same, but 0.x packages break on minors, so warn instead. */
  strictness: "major" | "minor-warn";
  /** Files copied together with the requested one (ES module siblings). */
  siblings?: (file: string) => string[];
  /** Optional name normalisation (e.g. a minified file the package no longer ships). */
  alias?: (file: string) => string;
  destDir: string;
}

const LIBRARIES: Readonly<Record<string, LibrarySpec>> = {
  gsap: {
    pkg: "gsap",
    buildDir: "dist",
    defaultFile: "gsap.min.js",
    strictness: "major",
    destDir: "vendor",
  },
  "lottie-web": {
    pkg: "lottie-web",
    buildDir: "build/player",
    defaultFile: "lottie.min.js",
    strictness: "major",
    destDir: "vendor",
  },
  animejs: {
    pkg: "animejs",
    buildDir: "dist/bundles",
    defaultFile: "anime.umd.min.js",
    strictness: "major",
    destDir: "vendor",
  },
  three: {
    pkg: "three",
    buildDir: "build",
    defaultFile: "three.module.js",
    strictness: "minor-warn",
    alias: (file) => file.replace(".min", ""),
    siblings: (file) => (file.startsWith("three.module") ? ["three.core.js"] : []),
    destDir: "vendor/three",
  },
};

export function isKnownLibrary(pkg: string | undefined): boolean {
  return pkg !== undefined && pkg in LIBRARIES;
}

function parseMajorMinor(version: string | undefined): [number, number] | undefined {
  const match = /^[~^v]?(\d+)(?:\.(\d+))?/.exec(version ?? "");
  if (!match) return undefined;
  return [Number(match[1]), Number(match[2] ?? 0)];
}

function readBundledVersion(pkgDir: string): string {
  // Sync on purpose: the resolver is called from String.replace, which cannot await.
  const raw = readFileSync(path.join(pkgDir, "package.json"), "utf8");
  return (JSON.parse(raw) as { version: string }).version;
}

function checkVersion(
  spec: LibrarySpec,
  requested: string | undefined,
  bundled: string,
): { ok: true; note?: string } | { ok: false; reason: string } {
  const want = parseMajorMinor(requested);
  const have = parseMajorMinor(bundled);
  if (!want || !have || requested === bundled) return { ok: true };
  if (want[0] !== have[0]) {
    return {
      ok: false,
      reason: `${spec.pkg}@${requested} is not compatible with the bundled ${bundled}; download that exact version into vendor/ by hand.`,
    };
  }
  const suffix = spec.strictness === "minor-warn" ? ": check that the API still matches" : "";
  const sameMinor = want[1] === have[1];
  if (spec.strictness === "major" && sameMinor) return { ok: true };
  return { ok: true, note: `requested ${requested}, vendored ${bundled}${suffix}` };
}

function requestedFile(spec: LibrarySpec, ref: CdnRef): string {
  const base = path.posix.basename(ref.filePath);
  const looksLikeFile = /\.(m?js|cjs)$/.test(base);
  const file = looksLikeFile ? base : spec.defaultFile;
  return spec.alias ? spec.alias(file) : file;
}

/** Decides what to copy for a known library URL, or why it cannot be vendored. */
export function planLibrary(ref: CdnRef): LibraryPlan {
  const spec = ref.pkg ? LIBRARIES[ref.pkg] : undefined;
  if (!spec) {
    return {
      kind: "unsupported",
      reason: "not a library motionforge bundles (gsap, lottie-web, three, animejs)",
    };
  }
  if (ref.filePath.startsWith("examples/")) {
    return {
      kind: "unsupported",
      reason:
        "addon modules (examples/jsm) import bare module names and need an import map; vendor them by hand",
    };
  }
  const pkgDir = findPackageDir(spec.pkg);
  const bundled = readBundledVersion(pkgDir);
  const verdict = checkVersion(spec, ref.version, bundled);
  if (!verdict.ok) return { kind: "unsupported", reason: verdict.reason };

  const file = requestedFile(spec, ref);
  const source = path.join(pkgDir, ...spec.buildDir.split("/"), file);
  if (!existsSync(source)) {
    return { kind: "unsupported", reason: `${file} is not shipped by ${spec.pkg}@${bundled}` };
  }
  const names = [file, ...(spec.siblings?.(file) ?? [])];
  const copies = names.map((name) => ({
    source: path.join(pkgDir, ...spec.buildDir.split("/"), name),
    dest: `${spec.destDir}/${name}`,
  }));
  const plan: LibraryPlan = { kind: "plan", copies, entry: `${spec.destDir}/${file}` };
  return verdict.note === undefined ? plan : { ...plan, note: verdict.note };
}
