import path from "node:path";
import { z } from "zod";
import { MotionForgeError } from "../core/errors.js";
import { readJsonIfExists, writeJson } from "../core/fs-utils.js";

const text = z.string().default("");

export const LedgerEntrySchema = z.object({
  file: z.string().min(1),
  provider: z.string().min(1),
  id: z.string().default(""),
  title: text,
  author: text,
  author_url: text,
  source_url: text,
  license: z.string().min(1),
  license_url: text,
  attribution_required: z.boolean().default(false),
  attribution_text: text,
  downloaded_at: text,
});

export type LedgerEntry = z.infer<typeof LedgerEntrySchema>;

export const LEDGER_RELATIVE_PATH = "assets/LICENCAS.json";

export function ledgerPath(projectDir: string): string {
  return path.join(projectDir, "assets", "LICENCAS.json");
}

/** Normalises a ledger `file` value to a project-relative, forward-slash path. */
export function normalizeLedgerFile(file: string): string {
  return path.posix.normalize(file.replaceAll("\\", "/")).replace(/^\.\//, "");
}

export function parseLedger(raw: unknown): LedgerEntry[] {
  const parsed = z.array(LedgerEntrySchema).safeParse(raw);
  if (parsed.success) return parsed.data;
  const issue = parsed.error.issues[0];
  const location = issue?.path.join(".");
  const where = issue ? `${location ? `${location}: ` : ""}${issue.message}` : "unexpected shape";
  throw new MotionForgeError(
    `${LEDGER_RELATIVE_PATH} is not valid (${where}).`,
    "It must be a JSON list of entries with at least file, provider and license.",
  );
}

export async function readLedger(projectDir: string): Promise<LedgerEntry[]> {
  const file = ledgerPath(projectDir);
  let raw: unknown;
  try {
    raw = await readJsonIfExists(file);
  } catch (error) {
    throw new MotionForgeError(
      `${LEDGER_RELATIVE_PATH} is not valid JSON: ${(error as Error).message}`,
      "Fix the file by hand or restore it from version control.",
    );
  }
  return raw === undefined ? [] : parseLedger(raw);
}

/** Adds an entry, replacing any earlier entry for the same file. */
export async function recordLicense(projectDir: string, entry: LedgerEntry): Promise<void> {
  const current = await readLedger(projectDir);
  const key = normalizeLedgerFile(entry.file);
  const next = current.filter((e) => normalizeLedgerFile(e.file) !== key);
  next.push({ ...entry, file: key });
  await writeJson(ledgerPath(projectDir), next);
}

/** True for Creative Commons NonCommercial / NoDerivatives licences. */
export function isRestrictedLicense(license: string): boolean {
  return /(?:^|[\s_-])(?:nc|nd)(?:[\s_-]|$)/i.test(license);
}
