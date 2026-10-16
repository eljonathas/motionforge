import type { Element } from "domhandler";
import { allElements, parentElement, select, selectorFor, type HtmlDocument } from "./document.js";

export interface Scene {
  root: Element;
  selector: string;
  elements: Element[];
}

const SCENE_MARKER = "[data-scene], .scene, [data-role='scene'], [data-composition-id]";

function descendantsOf(doc: HtmlDocument, root: Element): Element[] {
  return [root, ...select(doc, "*", root)];
}

/**
 * Splits a composition into scenes. A scene is the innermost element carrying a scene marker
 * (`data-scene`, `.scene` or `data-composition-id`). Containers that only host sub-compositions
 * (`data-composition-src`) are not scenes: their content lives in another file. A document without
 * any marker is treated as one scene.
 */
export function findScenes(doc: HtmlDocument): Scene[] {
  const hosts = new Set(select(doc, "[data-composition-src]"));
  const markers = select(doc, SCENE_MARKER).filter((el) => !hosts.has(el));
  const leaves = markers.filter((el) => {
    const inner = doc.$(el).find(SCENE_MARKER).length;
    return inner === 0;
  });
  if (leaves.length > 0) return leaves.map((root) => toScene(doc, root));
  if (hosts.size > 0) return [];
  const body = select(doc, "body")[0];
  const contentful = allElements(doc).some(
    (el) =>
      !["html", "head", "body", "style", "script", "meta", "title", "link"].includes(el.tagName),
  );
  return body && contentful ? [toScene(doc, body)] : [];
}

function toScene(doc: HtmlDocument, root: Element): Scene {
  return { root, selector: selectorFor(doc, root), elements: descendantsOf(doc, root) };
}

/** The element and its ancestors, nearest first. */
export function ancestorsAndSelf(el: Element): Element[] {
  const out: Element[] = [];
  for (let cur: Element | undefined = el; cur; cur = parentElement(cur)) out.push(cur);
  return out;
}
