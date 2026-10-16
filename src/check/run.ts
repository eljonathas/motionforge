import { existsSync } from "node:fs";
import path from "node:path";
import {
  LEDGER_RELATIVE_PATH,
  normalizeLedgerFile,
  readLedger,
  type LedgerEntry,
} from "../assets/ledger.js";
import { MotionForgeError, describeError } from "../core/errors.js";
import { isDirectory, listHtmlFiles, readText, toPosix, walkFiles } from "../core/fs-utils.js";
import { loadHtml } from "./document.js";
import { checkLicenses } from "./licenses.js";
import { checkNetwork } from "./network.js";
import {
  checkPrimitiveAesthetic,
  DEFAULT_PRIMITIVE_OPTIONS,
  type PrimitiveOptions,
} from "./primitives.js";
import { collectRefs } from "./refs.js";
import type { CheckReport, Finding } from "./types.js";

export interface CheckOptions {
  maxPrimitiveRatio?: number;
}

async function readLedgerSafely(
  root: string,
): Promise<{ ledger: LedgerEntry[]; problem?: Finding }> {
  try {
    return { ledger: await readLedger(root) };
  } catch (error) {
    return {
      ledger: [],
      problem: {
        rule: "ledger-invalid",
        severity: "error",
        file: LEDGER_RELATIVE_PATH,
        selector: "",
        message: describeError(error),
        fix: "Fix the JSON so every entry has file, provider and license.",
      },
    };
  }
}

async function listAssetFiles(root: string): Promise<string[]> {
  const dir = path.join(root, "assets");
  if (!(await isDirectory(dir))) return [];
  const files = await walkFiles(dir, { ignoreDirs: new Set(["node_modules"]) });
  return files
    .map((f) => toPosix(path.relative(root, f)))
    .filter((f) => f !== LEDGER_RELATIVE_PATH && !path.posix.basename(f).startsWith("."));
}

const SEVERITY_ORDER = { error: 0, warning: 1, info: 2 } as const;

function sortFindings(findings: Finding[]): Finding[] {
  return [...findings].sort(
    (a, b) =>
      a.file.localeCompare(b.file) ||
      (a.line ?? 0) - (b.line ?? 0) ||
      SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] ||
      a.rule.localeCompare(b.rule),
  );
}

/** Runs the static checks (licences, network, primitive aesthetic) over every .html in the project. */
export async function checkProject(dir: string, options: CheckOptions = {}): Promise<CheckReport> {
  const root = path.resolve(dir);
  if (!(await isDirectory(root)))
    throw new MotionForgeError(`Project directory not found: ${root}`);

  const { ledger, problem } = await readLedgerSafely(root);
  const licensed = new Set(ledger.map((e) => normalizeLedgerFile(e.file)));
  const primitiveOptions: PrimitiveOptions = {
    ...DEFAULT_PRIMITIVE_OPTIONS,
    licensed,
    ...(options.maxPrimitiveRatio === undefined
      ? {}
      : { maxPrimitiveRatio: options.maxPrimitiveRatio }),
  };

  const htmlFiles = await listHtmlFiles(root);
  const documents: { file: string; refs: ReturnType<typeof collectRefs> }[] = [];
  const findings: Finding[] = problem ? [problem] : [];
  for (const htmlPath of htmlFiles) {
    const doc = loadHtml(toPosix(path.relative(root, htmlPath)), await readText(htmlPath));
    const refs = collectRefs(doc);
    documents.push({ file: doc.file, refs });
    findings.push(...checkNetwork(doc, refs), ...checkPrimitiveAesthetic(doc, primitiveOptions));
  }
  findings.push(
    ...checkLicenses({
      ledger,
      assetFiles: await listAssetFiles(root),
      documents,
      fileExists: (rel) => existsSync(path.join(root, ...rel.split("/"))),
    }),
  );

  const sorted = sortFindings(findings);
  return {
    projectDir: root,
    filesChecked: htmlFiles.length,
    findings: sorted,
    errors: sorted.filter((f) => f.severity === "error").length,
    warnings: sorted.filter((f) => f.severity === "warning").length,
  };
}

export function formatCheckReport(report: CheckReport): string {
  const lines: string[] = [];
  for (const f of report.findings) {
    const where = f.line === undefined ? f.file : `${f.file}:${f.line}`;
    const target = f.selector ? ` ${f.selector}` : "";
    lines.push(`${where} [${f.severity}] ${f.rule}${target}`, `  ${f.message}`, `  fix: ${f.fix}`);
  }
  lines.push(
    `${report.filesChecked} file(s) checked: ${report.errors} error(s), ${report.warnings} warning(s).`,
  );
  return lines.join("\n");
}
