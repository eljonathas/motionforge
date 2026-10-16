import { CDN_URL_PATTERN, parseCdnUrl, type CdnRef } from "./cdn.js";

export type Resolution =
  { kind: "local"; path: string; note?: string } | { kind: "unsupported"; reason: string };

export interface Replacement {
  from: string;
  to: string;
  note: string | undefined;
}

export interface Skipped {
  url: string;
  reason: string;
}

export interface RewriteResult {
  html: string;
  replaced: Replacement[];
  skipped: Skipped[];
}

/** Trailing punctuation that belongs to the surrounding text, not to the URL. */
function trimUrl(raw: string): string {
  return raw.replace(/[,;.]+$/, "");
}

/**
 * Pure rewrite of CDN URLs in a document. `resolve` decides, per URL, whether a vendored local copy
 * exists. Unresolvable URLs are left untouched and reported.
 */
export function rewriteCdnRefs(html: string, resolve: (ref: CdnRef) => Resolution): RewriteResult {
  const replaced: Replacement[] = [];
  const skipped: Skipped[] = [];
  const seen = new Set<string>();

  const out = html.replace(CDN_URL_PATTERN, (match) => {
    const url = trimUrl(match);
    const tail = match.slice(url.length);
    const ref = parseCdnUrl(url);
    if (!ref) return match;
    const outcome = resolve(ref);
    if (outcome.kind === "unsupported") {
      if (!seen.has(url)) skipped.push({ url, reason: outcome.reason });
      seen.add(url);
      return match;
    }
    if (!seen.has(url)) replaced.push({ from: url, to: outcome.path, note: outcome.note });
    seen.add(url);
    return outcome.path + tail;
  });
  return { html: out, replaced, skipped };
}
