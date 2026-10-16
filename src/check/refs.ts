import { generate, parse, walk } from "css-tree";
import type { CssNode } from "css-tree";
import type { Element } from "domhandler";
import path from "node:path";
import { allElements, inlineScripts, lineOf, selectorFor, type HtmlDocument } from "./document.js";

export type RefKind =
  | "img"
  | "video"
  | "audio"
  | "poster"
  | "svg-image"
  | "css-url"
  | "lottie"
  | "model"
  | "script"
  | "stylesheet"
  | "frame"
  | "other";

/** Kinds that carry visible or audible material and therefore need a licence entry. */
export const LICENSED_KINDS: ReadonlySet<RefKind> = new Set([
  "img",
  "video",
  "audio",
  "poster",
  "svg-image",
  "css-url",
  "lottie",
  "model",
]);

export interface AssetRef {
  url: string;
  kind: RefKind;
  selector: string;
  line: number | undefined;
}

export function isRemote(url: string): boolean {
  return /^(?:https?:)?\/\//i.test(url.trim());
}

function isNonFile(url: string): boolean {
  return (
    /^(?:data:|blob:|about:|javascript:|mailto:|tel:|#)/i.test(url.trim()) || url.trim() === ""
  );
}

/** Project-relative forward-slash path of a local reference, or undefined if it is not a local file. */
export function resolveLocal(fileRel: string, url: string): string | undefined {
  const trimmed = url.trim();
  if (isRemote(trimmed) || isNonFile(trimmed)) return undefined;
  const clean = decodeSafe(trimmed.split(/[?#]/)[0] ?? "");
  if (clean === "") return undefined;
  const joined = clean.startsWith("/")
    ? clean.slice(1)
    : path.posix.join(path.posix.dirname(fileRel), clean);
  return path.posix.normalize(joined);
}

function decodeSafe(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

type AttrSource = { tag: string; attr: string; kind: RefKind };

const ATTRIBUTE_SOURCES: readonly AttrSource[] = [
  { tag: "img", attr: "src", kind: "img" },
  { tag: "video", attr: "src", kind: "video" },
  { tag: "video", attr: "poster", kind: "poster" },
  { tag: "audio", attr: "src", kind: "audio" },
  { tag: "track", attr: "src", kind: "other" },
  { tag: "image", attr: "href", kind: "svg-image" },
  { tag: "image", attr: "xlink:href", kind: "svg-image" },
  { tag: "lottie-player", attr: "src", kind: "lottie" },
  { tag: "dotlottie-player", attr: "src", kind: "lottie" },
  { tag: "model-viewer", attr: "src", kind: "model" },
  { tag: "iframe", attr: "src", kind: "frame" },
  { tag: "embed", attr: "src", kind: "frame" },
  { tag: "object", attr: "data", kind: "frame" },
  { tag: "script", attr: "src", kind: "script" },
];

const LINK_STYLE_RELS = /\b(stylesheet|preload|modulepreload|icon)\b/i;

function sourceKind(el: Element): RefKind {
  const parent = el.parent && "tagName" in el.parent ? el.parent.tagName : "";
  return parent === "audio" ? "audio" : "video";
}

function srcsetUrls(value: string): string[] {
  return value
    .split(",")
    .map((part) => part.trim().split(/\s+/)[0] ?? "")
    .filter((u) => u !== "");
}

function elementRefs(doc: HtmlDocument, el: Element): AssetRef[] {
  const out: AssetRef[] = [];
  const base = { selector: selectorFor(doc, el), line: lineOf(el) };
  for (const source of ATTRIBUTE_SOURCES) {
    const value = el.attribs[source.attr];
    if (el.tagName === source.tag && value) out.push({ ...base, url: value, kind: source.kind });
  }
  if (el.tagName === "source") {
    const kind = el.attribs["srcset"] === undefined ? sourceKind(el) : "img";
    for (const u of [el.attribs["src"] ?? "", ...srcsetUrls(el.attribs["srcset"] ?? "")]) {
      if (u) out.push({ ...base, url: u, kind });
    }
  }
  if (el.tagName === "img" && el.attribs["srcset"]) {
    for (const u of srcsetUrls(el.attribs["srcset"])) out.push({ ...base, url: u, kind: "img" });
  }
  if (
    el.tagName === "link" &&
    el.attribs["href"] &&
    LINK_STYLE_RELS.test(el.attribs["rel"] ?? "")
  ) {
    out.push({ ...base, url: el.attribs["href"], kind: "stylesheet" });
  }
  return out;
}

/** url() and @import references of one stylesheet, labelled with the rule that declares them. */
export function cssRefs(
  css: string,
  fallbackSelector: string,
  line: number | undefined,
): AssetRef[] {
  const out: AssetRef[] = [];
  let current = fallbackSelector;
  walk(parse(css, { positions: false }), {
    enter(node: CssNode) {
      if (node.type === "Rule") current = generate(node.prelude);
      else if (node.type === "Atrule") current = `@${node.name}`;
      else if (node.type === "Url") {
        const kind = current === "@import" ? "stylesheet" : "css-url";
        out.push({ url: node.value, kind, selector: current, line });
      } else if (node.type === "String" && current === "@import") {
        out.push({ url: node.value, kind: "stylesheet", selector: current, line });
      }
    },
    leave(node: CssNode) {
      if (node.type === "Rule" || node.type === "Atrule") current = fallbackSelector;
    },
  });
  return out;
}

const LOTTIE_CALL = /loadAnimation\s*\(\s*\{([\s\S]*?)\}\s*\)/g;

/** `path: "x.json"` values passed to lottie.loadAnimation({...}) in inline scripts. */
export function lottiePaths(doc: HtmlDocument): { url: string; container: string | undefined }[] {
  const out: { url: string; container: string | undefined }[] = [];
  for (const script of inlineScripts(doc)) {
    for (const call of script.matchAll(LOTTIE_CALL)) {
      const body = call[1] ?? "";
      const url = /\bpath\s*:\s*(["'`])(.*?)\1/.exec(body)?.[2];
      if (!url) continue;
      const container =
        /container\s*:\s*document\s*\.\s*(?:getElementById\(\s*["']([^"']+)["']|querySelector\(\s*["']([^"']+)["'])/.exec(
          body,
        );
      const selector = container?.[1] ? `#${container[1]}` : container?.[2];
      out.push({ url, container: selector });
    }
  }
  return out;
}

/** Every file reference of a composition: attributes, inline styles, <style> blocks and lottie paths. */
export function collectRefs(doc: HtmlDocument): AssetRef[] {
  const out: AssetRef[] = [];
  for (const el of allElements(doc)) {
    out.push(...elementRefs(doc, el));
    const inline = el.attribs["style"];
    if (inline && /url\(/i.test(inline)) {
      for (const ref of cssRefs(`x{${inline}}`, selectorFor(doc, el), lineOf(el))) {
        out.push({ ...ref, selector: selectorFor(doc, el) });
      }
    }
    if (el.tagName === "style") out.push(...cssRefs(doc.$(el).text(), "style", lineOf(el)));
  }
  for (const lottie of lottiePaths(doc)) {
    out.push({
      url: lottie.url,
      kind: "lottie",
      selector: lottie.container ?? "script",
      line: undefined,
    });
  }
  return out;
}
