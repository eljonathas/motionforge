import { generate, parse, walk } from "css-tree";
import type { CssNode, Rule, SelectorList } from "css-tree";
import type { Element } from "domhandler";
import { select, type HtmlDocument } from "./document.js";

export type Declarations = ReadonlyMap<string, string>;

interface MatchedRule {
  specificity: number;
  order: number;
  declarations: [string, string][];
}

function readDeclarations(node: CssNode): [string, string][] {
  const out: [string, string][] = [];
  walk(node, {
    visit: "Declaration",
    enter(decl) {
      out.push([decl.property.toLowerCase(), generate(decl.value).trim()]);
    },
  });
  return out;
}

/** Approximate specificity of one complex selector: ids, then classes/attributes/pseudo-classes, then types. */
function specificityOf(selector: CssNode): number {
  let ids = 0;
  let classes = 0;
  let types = 0;
  walk(selector, (node) => {
    if (node.type === "IdSelector") ids++;
    else if (node.type === "ClassSelector" || node.type === "AttributeSelector") classes++;
    else if (node.type === "PseudoClassSelector") classes++;
    else if (node.type === "TypeSelector" && node.name !== "*") types++;
  });
  return ids * 10_000 + classes * 100 + types;
}

function splitSelectors(list: SelectorList): { text: string; specificity: number }[] {
  const out: { text: string; specificity: number }[] = [];
  list.children.forEach((selector) => {
    out.push({ text: generate(selector), specificity: specificityOf(selector) });
  });
  return out;
}

const UNMATCHABLE = /::|:(hover|focus|active|visited|focus-visible|focus-within|before|after)\b/;

function topLevelRules(css: string): Rule[] {
  const ast = parse(css, { positions: false });
  const rules: Rule[] = [];
  if (ast.type !== "StyleSheet") return rules;
  ast.children.forEach((node) => {
    if (node.type === "Rule") rules.push(node);
  });
  return rules;
}

/**
 * Builds a resolver of the declarations that apply to an element: `<style>` rules ordered by
 * specificity and source order, then the inline `style` attribute. Combinators are honoured through
 * the selector engine; media queries and keyframes are ignored on purpose.
 */
export function buildStyleResolver(doc: HtmlDocument): (el: Element) => Declarations {
  const matched = new Map<Element, MatchedRule[]>();
  let order = 0;
  doc.$("style").each((_, styleEl) => {
    for (const rule of topLevelRules(doc.$(styleEl).text())) {
      const declarations = readDeclarations(rule.block);
      if (rule.prelude.type !== "SelectorList") continue;
      for (const sel of splitSelectors(rule.prelude)) {
        if (UNMATCHABLE.test(sel.text)) continue;
        order++;
        collect(doc, sel.text, { specificity: sel.specificity, order, declarations }, matched);
      }
    }
  });

  return (el) => {
    const result = new Map<string, string>();
    const rules = [...(matched.get(el) ?? [])].sort(
      (a, b) => a.specificity - b.specificity || a.order - b.order,
    );
    for (const rule of rules)
      for (const [prop, value] of rule.declarations) result.set(prop, value);
    const inline = el.attribs["style"];
    if (inline) {
      for (const [prop, value] of readDeclarations(parse(inline, { context: "declarationList" }))) {
        result.set(prop, value);
      }
    }
    return result;
  };
}

function collect(
  doc: HtmlDocument,
  selector: string,
  rule: MatchedRule,
  into: Map<Element, MatchedRule[]>,
): void {
  let elements: Element[];
  try {
    elements = select(doc, selector);
  } catch {
    return;
  }
  for (const el of elements) into.set(el, [...(into.get(el) ?? []), rule]);
}

export function extractUrls(value: string): string[] {
  const urls: string[] = [];
  for (const match of value.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)\s]*))\s*\)/gi)) {
    const url = match[1] ?? match[2] ?? match[3] ?? "";
    if (url !== "") urls.push(url);
  }
  return urls;
}

export function hasGradient(value: string): boolean {
  return /(?:repeating-)?(?:linear|radial|conic)-gradient\(/i.test(value);
}
