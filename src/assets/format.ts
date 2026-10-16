import type { AssetCandidate } from "./types.js";
import type { GetAssetResult } from "./get.js";

export function formatCandidates(results: readonly AssetCandidate[]): string {
  if (results.length === 0) return "No results.";
  return results
    .map((c) => {
      const credit = c.author ? ` by ${c.author}` : "";
      return `${c.provider}:${c.id}  [${c.kind}] ${c.title}${credit}  (${c.license})\n    ${c.source_url}`;
    })
    .join("\n");
}

export function formatDownload(result: GetAssetResult): string {
  const { candidate, entries } = result;
  const lines = entries.map((e) => `saved ${e.file}`);
  lines.push(`licence: ${candidate.license} (${candidate.license_url})`);
  if (candidate.attribution_required)
    lines.push(`attribution required: ${candidate.attribution_text}`);
  lines.push("recorded in assets/LICENCAS.json");
  return lines.join("\n");
}
