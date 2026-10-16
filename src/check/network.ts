import { parseCdnUrl } from "../vendor/cdn.js";
import { inlineScripts, type HtmlDocument } from "./document.js";
import { stripJsComments } from "./gsap.js";
import { isRemote, type AssetRef } from "./refs.js";
import type { Finding } from "./types.js";

const SCRIPT_URL = /https?:\/\/[^\s"'`)<>\\]+/g;
const HARMLESS_NAMESPACES = /^https?:\/\/(?:www\.)?w3\.org\//i;

function fixFor(url: string): string {
  return parseCdnUrl(url)
    ? "Run `reelcraft vendor` to copy it locally, or download it into the project and reference the local file."
    : "Download the file with `reelcraft assets get` (or into assets/) and reference the local copy.";
}

function finding(
  doc: HtmlDocument,
  url: string,
  selector: string,
  line: number | undefined,
): Finding {
  return {
    rule: "remote-url",
    severity: "error",
    file: doc.file,
    selector,
    ...(line === undefined ? {} : { line }),
    message: `Remote URL ${url}: renders must work offline to stay deterministic.`,
    fix: fixFor(url),
  };
}

/** Flags every remote URL a composition would fetch at render time. */
export function checkNetwork(doc: HtmlDocument, refs: readonly AssetRef[]): Finding[] {
  const findings: Finding[] = [];
  const seen = new Set<string>();
  const push = (url: string, selector: string, line: number | undefined): void => {
    if (seen.has(url)) return;
    seen.add(url);
    findings.push(finding(doc, url, selector, line));
  };

  for (const ref of refs) if (isRemote(ref.url)) push(ref.url.trim(), ref.selector, ref.line);

  doc.$("script[type='importmap']").each((_, el) => {
    for (const match of doc.$(el).text().matchAll(SCRIPT_URL))
      push(match[0], "script[type=importmap]", undefined);
  });

  for (const script of inlineScripts(doc)) {
    for (const match of stripJsComments(script).matchAll(SCRIPT_URL)) {
      if (!HARMLESS_NAMESPACES.test(match[0])) push(match[0], "script", undefined);
    }
  }
  return findings;
}
