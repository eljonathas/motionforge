import path from "node:path";
import { MotionForgeError } from "../core/errors.js";
import { toPosix } from "../core/fs-utils.js";
import { recordLicense, type LedgerEntry } from "./ledger.js";
import type { ProviderRegistry } from "./registry.js";
import type { AssetCandidate, FileDownloader } from "./types.js";

export interface GetAssetDeps {
  registry: ProviderRegistry;
  downloader: FileDownloader;
  now: () => Date;
}

export interface GetAssetResult {
  candidate: AssetCandidate;
  entries: LedgerEntry[];
}

export function parseAssetRef(ref: string): { provider: string; id: string } {
  const colon = ref.indexOf(":");
  if (colon <= 0 || colon === ref.length - 1) {
    throw new MotionForgeError(
      `"${ref}" is not a valid asset reference.`,
      "Use <provider>:<id>, for example pexels:1234567.",
    );
  }
  return { provider: ref.slice(0, colon), id: ref.slice(colon + 1) };
}

/** A provider-supplied relative path must stay inside the asset folder. */
function safeRelative(name: string): string {
  const normalized = path.posix.normalize(name.replaceAll("\\", "/"));
  if (normalized.startsWith("..") || normalized.startsWith("/") || /^[a-z]:/i.test(normalized)) {
    throw new MotionForgeError(
      `Refusing to write outside assets/: "${name}".`,
      "The provider returned an unexpected file path.",
    );
  }
  return normalized;
}

function entryFor(candidate: AssetCandidate, file: string, downloadedAt: string): LedgerEntry {
  return {
    file,
    provider: candidate.provider,
    id: candidate.id,
    title: candidate.title,
    author: candidate.author,
    author_url: candidate.author_url,
    source_url: candidate.source_url,
    license: candidate.license,
    license_url: candidate.license_url,
    attribution_required: candidate.attribution_required,
    attribution_text: candidate.attribution_text,
    downloaded_at: downloadedAt,
  };
}

/**
 * Downloads an asset into `assets/<kind>/` and records its licence in `assets/LICENCAS.json`.
 * Multi-file assets (glTF models) go into their own folder and every file gets an entry. The ledger
 * is only written after the file is on disk, so a failed download never leaves a licence orphan.
 */
export async function getAsset(
  projectDir: string,
  ref: string,
  deps: GetAssetDeps,
): Promise<GetAssetResult> {
  const { provider, id } = parseAssetRef(ref);
  const resolved = await deps.registry.get(provider).resolve(id);
  const { candidate, files } = resolved;
  const folder =
    files.length > 1
      ? `assets/${candidate.kind}/${candidate.provider}-${safeSegment(candidate.id)}`
      : `assets/${candidate.kind}`;
  const downloadedAt = deps.now().toISOString();
  const entries: LedgerEntry[] = [];

  for (const file of files) {
    const relative = `${folder}/${safeRelative(file.name)}`;
    await deps.downloader.download(file.url, path.join(projectDir, ...relative.split("/")));
    const entry = entryFor(candidate, toPosix(relative), downloadedAt);
    await recordLicense(projectDir, entry);
    entries.push(entry);
  }
  return { candidate, entries };
}

function safeSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_");
}
