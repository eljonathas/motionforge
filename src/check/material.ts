import type { Element } from "domhandler";
import { select, selectorFor, type HtmlDocument } from "./document.js";
import { resolveLocal } from "./refs.js";
import { extractUrls, hasGradient, type Declarations } from "./style.js";
import type { Scene } from "./scenes.js";
import { ancestorsAndSelf } from "./scenes.js";

export interface MaterialItem {
  selector: string;
  what: string;
}

export interface SceneMaterial {
  real: MaterialItem[];
  primitives: MaterialItem[];
  /** True when something gives the background depth: gradient, image, video, canvas, noise filter. */
  hasDepth: boolean;
}

export interface MaterialContext {
  doc: HtmlDocument;
  styleOf: (el: Element) => Declarations;
  /** Project-relative paths that have a licence entry. */
  licensed: ReadonlySet<string>;
  /** Selectors of containers that lottie scripts mount into. */
  lottieContainers: ReadonlySet<string>;
  /** True if the document's scripts load a 3D model or use a WebGL engine on a canvas. */
  uses3d: boolean;
}

const SHAPE_TAGS = new Set(["circle", "ellipse", "rect", "line"]);
const NEUTRAL_SVG_TAGS = new Set(["g", "defs", "title", "desc"]);
const NON_VISUAL = new Set([
  "script",
  "style",
  "link",
  "meta",
  "title",
  "head",
  "html",
  "body",
  "br",
  "template",
]);

function isZero(value: string | undefined): boolean {
  return (
    value === undefined || /^(0|0px|0%|none|initial|unset)(\s+(0|0px|0%))*$/i.test(value.trim())
  );
}

function hasVisibleFill(styles: Declarations): boolean {
  const bgColor = styles.get("background-color");
  const bg = styles.get("background");
  const border = styles.get("border");
  const filled = (v: string | undefined): boolean =>
    v !== undefined &&
    !/^(transparent|none|initial|inherit|unset|rgba?\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\s*\))$/i.test(
      v.trim(),
    );
  return (
    filled(bgColor) ||
    filled(bg) ||
    filled(styles.get("background-image")) ||
    (filled(border) && !/^0/.test(border ?? "")) ||
    filled(styles.get("box-shadow")) ||
    (filled(styles.get("border-width")) && filled(styles.get("border-style")))
  );
}

function isRounded(styles: Declarations): boolean {
  const radius = styles.get("border-radius");
  const clip = styles.get("clip-path") ?? "";
  return !isZero(radius) || /\b(circle|ellipse)\(/i.test(clip);
}

function backgroundUrls(styles: Declarations): string[] {
  return [styles.get("background"), styles.get("background-image")].flatMap((v) =>
    v ? extractUrls(v) : [],
  );
}

function svgShapeKind(doc: HtmlDocument, svg: Element): "primitive" | "other" {
  const tags = select(doc, "*", svg).map((el) => el.tagName);
  const shapes = tags.filter((t) => SHAPE_TAGS.has(t)).length;
  const foreign = tags.filter((t) => !SHAPE_TAGS.has(t) && !NEUTRAL_SVG_TAGS.has(t)).length;
  return shapes > 0 && foreign === 0 ? "primitive" : "other";
}

function imageIsRealMaterial(
  ctx: MaterialContext,
  fileRel: string,
  src: string | undefined,
): boolean {
  if (!src) return false;
  const local = resolveLocal(fileRel, src);
  if (!/\.svg(?:[?#].*)?$/i.test(src)) return true;
  return local !== undefined && ctx.licensed.has(local);
}

function classifyElement(ctx: MaterialContext, el: Element, out: SceneMaterial): void {
  const { doc } = ctx;
  const item = (what: string): MaterialItem => ({ selector: selectorFor(doc, el), what });
  const styles = ctx.styleOf(el);
  const ownSrc = el.attribs["src"] ?? el.attribs["href"] ?? el.attribs["xlink:href"];

  if (el.tagName === "img" || el.tagName === "image") {
    if (imageIsRealMaterial(ctx, doc.file, ownSrc ?? el.attribs["srcset"]))
      out.real.push(item("image"));
  } else if (el.tagName === "video") {
    out.real.push(item("video"));
  } else if (["lottie-player", "dotlottie-player"].includes(el.tagName)) {
    out.real.push(item("lottie"));
  } else if (el.tagName === "model-viewer") {
    out.real.push(item("3d model"));
  } else if (el.tagName === "canvas" && ctx.uses3d) {
    out.real.push(item("3d scene"));
  } else if (el.tagName === "svg") {
    if (svgShapeKind(doc, el) === "primitive") out.primitives.push(item("svg of basic shapes"));
  }

  const id = el.attribs["id"];
  if (id && ctx.lottieContainers.has(`#${id}`)) out.real.push(item("lottie"));
  if (backgroundUrls(styles).length > 0) out.real.push(item("background image"));
}

function insideSvg(el: Element): boolean {
  return ancestorsAndSelf(el)
    .slice(1)
    .some((a) => a.tagName === "svg");
}

function textOf(doc: HtmlDocument, el: Element): string {
  return doc.$(el).text().trim();
}

function isDecorativeBox(ctx: MaterialContext, el: Element): boolean {
  if (NON_VISUAL.has(el.tagName) || el.tagName === "svg" || insideSvg(el)) return false;
  if (["img", "video", "canvas", "picture", "iframe"].includes(el.tagName)) return false;
  const styles = ctx.styleOf(el);
  if (!isRounded(styles) || !hasVisibleFill(styles) || backgroundUrls(styles).length > 0)
    return false;
  if (textOf(ctx.doc, el) !== "") return false;
  return ctx.doc.$(el).find("img, video, canvas, svg, picture").length === 0;
}

function givesDepth(ctx: MaterialContext, el: Element): boolean {
  const styles = ctx.styleOf(el);
  const bg = `${styles.get("background") ?? ""} ${styles.get("background-image") ?? ""}`;
  if (hasGradient(bg) || /url\(/i.test(bg)) return true;
  if (["img", "video", "canvas", "image"].includes(el.tagName)) return true;
  return el.tagName.toLowerCase() === "feturbulence" || /url\(/i.test(styles.get("filter") ?? "");
}

/** Counts real material, decorative primitives and background depth inside one scene. */
export function analyseScene(ctx: MaterialContext, scene: Scene): SceneMaterial {
  const out: SceneMaterial = { real: [], primitives: [], hasDepth: false };
  for (const el of scene.elements) {
    classifyElement(ctx, el, out);
    if (isDecorativeBox(ctx, el))
      out.primitives.push({
        selector: selectorFor(ctx.doc, el),
        what: "rounded or circular shape",
      });
    if (givesDepth(ctx, el)) out.hasDepth = true;
  }
  const inherited = ancestorsAndSelf(scene.root).slice(1);
  out.hasDepth ||= inherited.some((el) => {
    const styles = ctx.styleOf(el);
    const bg = `${styles.get("background") ?? ""} ${styles.get("background-image") ?? ""}`;
    return hasGradient(bg) || /url\(/i.test(bg);
  });
  return out;
}

/** The solid colour behind a scene, looking from the scene root up to the document. */
export function sceneBackgroundColor(ctx: MaterialContext, scene: Scene): string | undefined {
  for (const el of ancestorsAndSelf(scene.root)) {
    const styles = ctx.styleOf(el);
    const value = styles.get("background-color") ?? styles.get("background");
    if (value && !/^(transparent|none)$/i.test(value)) return value;
  }
  return undefined;
}
