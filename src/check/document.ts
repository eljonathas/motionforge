import * as cheerio from "cheerio";
import type { CheerioAPI } from "cheerio";
import { isTag, type AnyNode, type Element } from "domhandler";

export interface HtmlDocument {
  /** Path relative to the project root, forward slashes. */
  file: string;
  html: string;
  $: CheerioAPI;
}

export function loadHtml(file: string, html: string): HtmlDocument {
  return { file, html, $: cheerio.load(html, { sourceCodeLocationInfo: true }) };
}

function onlyElements(nodes: readonly AnyNode[]): Element[] {
  return nodes.filter((n): n is Element => isTag(n));
}

/** Elements matching `selector`, inside `within` when given (template content included). */
export function select(doc: HtmlDocument, selector: string, within?: Element): Element[] {
  const scope = within ? doc.$(within).find(selector) : doc.$(selector);
  return onlyElements(scope.toArray());
}

export function allElements(doc: HtmlDocument): Element[] {
  return select(doc, "*");
}

export function lineOf(el: Element): number | undefined {
  return el.sourceCodeLocation?.startLine;
}

export function parentElement(el: Element): Element | undefined {
  const parent = el.parent;
  return parent && "tagName" in parent ? parent : undefined;
}

/** Contents of every inline `<script>` that is not a data block (JSON, importmap, templates). */
export function inlineScripts(doc: HtmlDocument): string[] {
  const out: string[] = [];
  doc.$("script").each((_, el) => {
    const type = (el.attribs["type"] ?? "").toLowerCase();
    if (el.attribs["src"] !== undefined) return;
    if (type !== "" && !/javascript|module/.test(type)) return;
    out.push(doc.$(el).text());
  });
  return out;
}

/** A short CSS-like selector that identifies an element for a human or an agent. */
export function selectorFor(doc: HtmlDocument, el: Element): string {
  const parts: string[] = [];
  let current: Element | undefined = el;
  for (
    let depth = 0;
    current && depth < 3 && !["html", "body"].includes(current.tagName);
    depth++
  ) {
    const part = describeOne(doc, current);
    parts.unshift(part.text);
    if (part.unique) break;
    current = parentElement(current);
  }
  return parts.join(" > ");
}

function describeOne(doc: HtmlDocument, el: Element): { text: string; unique: boolean } {
  const id = el.attribs["id"];
  if (id) return { text: `#${id}`, unique: true };
  const classes = (el.attribs["class"] ?? "").split(/\s+/).filter(Boolean).slice(0, 2);
  const base = el.tagName + classes.map((c) => `.${c}`).join("");
  const siblings = doc.$(el).parent().children(el.tagName).toArray();
  if (siblings.length <= 1) return { text: base, unique: false };
  return { text: `${base}:nth-of-type(${siblings.indexOf(el) + 1})`, unique: false };
}
