import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { MotionForgeError } from "../core/errors.js";
import { isDirectory, listHtmlFiles, readText, toPosix, writeText } from "../core/fs-utils.js";
import type { CdnRef } from "./cdn.js";
import { planLibrary, type PlannedCopy } from "./libraries.js";
import { rewriteCdnRefs, type Replacement, type Resolution, type Skipped } from "./rewrite.js";

export interface VendorFileReport {
  file: string;
  replaced: Replacement[];
  skipped: Skipped[];
}

export interface VendorReport {
  files: VendorFileReport[];
  copied: string[];
  replacedCount: number;
  skippedCount: number;
}

/** Resolver bound to one HTML file: vendored paths are written relative to that file. */
function makeResolver(
  htmlRelPath: string,
  copies: Map<string, PlannedCopy>,
): (ref: CdnRef) => Resolution {
  const htmlDir = path.posix.dirname(htmlRelPath);
  return (ref) => {
    if (ref.host === "google-fonts") {
      return {
        kind: "unsupported",
        reason:
          "Google Fonts need a local @font-face; download the font files into assets/ and record the licence",
      };
    }
    const plan = planLibrary(ref);
    if (plan.kind === "unsupported") return plan;
    for (const copy of plan.copies) copies.set(copy.dest, copy);
    const rel = path.posix.relative(htmlDir, plan.entry);
    const local = rel.startsWith(".") ? rel : `./${rel}`;
    return plan.note === undefined
      ? { kind: "local", path: local }
      : { kind: "local", path: local, note: plan.note };
  };
}

/** Replaces CDN references in every .html file under `dir` with copies in `<dir>/vendor/`. */
export async function vendorProject(dir: string): Promise<VendorReport> {
  const root = path.resolve(dir);
  if (!(await isDirectory(root))) {
    throw new MotionForgeError(`Project directory not found: ${root}`);
  }
  const copies = new Map<string, PlannedCopy>();
  const files: VendorFileReport[] = [];

  for (const htmlPath of await listHtmlFiles(root)) {
    const rel = toPosix(path.relative(root, htmlPath));
    const original = await readText(htmlPath);
    const result = rewriteCdnRefs(original, makeResolver(rel, copies));
    if (result.html !== original) await writeText(htmlPath, result.html);
    if (result.replaced.length > 0 || result.skipped.length > 0) {
      files.push({ file: rel, replaced: result.replaced, skipped: result.skipped });
    }
  }

  for (const copy of copies.values()) {
    const target = path.join(root, ...copy.dest.split("/"));
    await mkdir(path.dirname(target), { recursive: true });
    await copyFile(copy.source, target);
  }
  return {
    files,
    copied: [...copies.keys()].sort(),
    replacedCount: files.reduce((n, f) => n + f.replaced.length, 0),
    skippedCount: files.reduce((n, f) => n + f.skipped.length, 0),
  };
}

export function formatVendorReport(report: VendorReport): string {
  if (report.files.length === 0) return "No CDN references found.";
  const lines: string[] = [];
  for (const file of report.files) {
    for (const r of file.replaced) {
      lines.push(`vendored  ${file.file}: ${r.from} -> ${r.to}${r.note ? ` (${r.note})` : ""}`);
    }
    for (const s of file.skipped)
      lines.push(`skipped   ${file.file}: ${s.url}\n          ${s.reason}`);
  }
  lines.push(`${report.replacedCount} replaced, ${report.skippedCount} could not be vendored.`);
  return lines.join("\n");
}
