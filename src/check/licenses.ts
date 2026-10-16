import { isRestrictedLicense, normalizeLedgerFile, type LedgerEntry } from "../assets/ledger.js";
import { LICENSED_KINDS, resolveLocal, type AssetRef } from "./refs.js";
import type { Finding } from "./types.js";

export interface LicenseCheckInput {
  ledger: readonly LedgerEntry[];
  /** Files under assets/ (project-relative, forward slashes), LICENCAS.json excluded. */
  assetFiles: readonly string[];
  documents: readonly { file: string; refs: readonly AssetRef[] }[];
  fileExists: (projectRelative: string) => boolean;
}

const LEDGER_FILE = "assets/LICENCAS.json";

interface LocalUse {
  doc: string;
  ref: AssetRef;
  target: string;
}

function localUses(input: LicenseCheckInput): LocalUse[] {
  const uses: LocalUse[] = [];
  for (const { file, refs } of input.documents) {
    for (const ref of refs) {
      const target = resolveLocal(file, ref.url);
      if (
        target !== undefined &&
        (LICENSED_KINDS.has(ref.kind) || ref.kind === "script" || ref.kind === "stylesheet")
      ) {
        uses.push({ doc: file, ref, target });
      }
    }
  }
  return uses;
}

function referenceFinding(use: LocalUse, rule: string, message: string, fix: string): Finding {
  return {
    rule,
    severity: "error",
    file: use.doc,
    selector: use.ref.selector,
    ...(use.ref.line === undefined ? {} : { line: use.ref.line }),
    message,
    fix,
  };
}

/** Licence coverage for local assets plus NC/ND flags. Pure: all file-system facts come in `input`. */
export function checkLicenses(input: LicenseCheckInput): Finding[] {
  const findings: Finding[] = [];
  const licensed = new Map(input.ledger.map((e) => [normalizeLedgerFile(e.file), e]));
  const uses = localUses(input);
  const referenced = new Set(uses.map((u) => u.target));

  for (const use of uses) {
    if (!input.fileExists(use.target)) {
      findings.push(
        referenceFinding(
          use,
          "missing-file",
          `${use.target} is referenced but does not exist.`,
          "Fix the path or download the file with `reelcraft assets get`.",
        ),
      );
    } else if (LICENSED_KINDS.has(use.ref.kind) && !licensed.has(use.target)) {
      findings.push(
        referenceFinding(
          use,
          "license-missing",
          `${use.target} has no entry in ${LEDGER_FILE}.`,
          "Re-download it with `reelcraft assets get <provider>:<id>` or add an entry with origin, author and licence.",
        ),
      );
    }
  }

  for (const file of input.assetFiles) {
    if (licensed.has(file) || referenced.has(file)) continue;
    findings.push({
      rule: "license-missing",
      severity: "error",
      file,
      selector: "",
      message: `${file} has no entry in ${LEDGER_FILE}.`,
      fix: "Add an entry with origin, author and licence, or delete the file.",
    });
  }

  for (const [file, entry] of licensed) {
    if (!input.fileExists(file)) {
      findings.push({
        rule: "ledger-stale",
        severity: "warning",
        file: LEDGER_FILE,
        selector: file,
        message: `${LEDGER_FILE} lists ${file}, which does not exist.`,
        fix: "Remove the stale entry or restore the file.",
      });
    }
    if (isRestrictedLicense(entry.license)) {
      findings.push({
        rule: "license-restricted",
        severity: referenced.has(file) ? "error" : "warning",
        file: LEDGER_FILE,
        selector: file,
        message: `${file} is licensed "${entry.license}" (NonCommercial or NoDerivatives), which does not allow commercial use with modification.`,
        fix: "Replace it with a CC0, CC-BY or CC-BY-SA alternative.",
      });
    }
  }
  return findings;
}
