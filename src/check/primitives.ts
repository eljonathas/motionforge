import type { Element } from "domhandler";
import { inlineScripts, lineOf, type HtmlDocument } from "./document.js";
import { isUniformMotion, parseTweens } from "./gsap.js";
import { analyseScene, sceneBackgroundColor, type MaterialContext } from "./material.js";
import { lottiePaths } from "./refs.js";
import { findScenes } from "./scenes.js";
import { buildStyleResolver } from "./style.js";
import type { Finding } from "./types.js";

export interface PrimitiveOptions {
  /** Share of primitives among (primitives + real material) above which a scene is flagged. */
  maxPrimitiveRatio: number;
  /** Ratio is only judged when a scene has at least this many primitives. */
  minPrimitivesForRatio: number;
  /** Project-relative paths with a licence entry (licensed SVG illustrations count as material). */
  licensed: ReadonlySet<string>;
}

export const DEFAULT_PRIMITIVE_OPTIONS: PrimitiveOptions = {
  maxPrimitiveRatio: 0.6,
  minPrimitivesForRatio: 3,
  licensed: new Set(),
};

const MODEL_FILE = /\.(glb|gltf|obj|fbx|usdz)\b/i;
const THREE_HINT = /\b(GLTFLoader|OBJLoader|FBXLoader|WebGLRenderer|THREE\.)/;

function makeContext(doc: HtmlDocument, options: PrimitiveOptions): MaterialContext {
  const scripts = inlineScripts(doc).join("\n");
  const lottie = new Set(lottiePaths(doc).flatMap((l) => (l.container ? [l.container] : [])));
  return {
    doc,
    styleOf: buildStyleResolver(doc),
    licensed: options.licensed,
    lottieContainers: lottie,
    uses3d: MODEL_FILE.test(scripts) || THREE_HINT.test(scripts),
  };
}

function sceneFinding(
  doc: HtmlDocument,
  root: Element,
  selector: string,
  partial: Pick<Finding, "rule" | "severity" | "message" | "fix">,
): Finding {
  const line = lineOf(root);
  return { ...partial, file: doc.file, selector, ...(line === undefined ? {} : { line }) };
}

function materialFindings(
  doc: HtmlDocument,
  ctx: MaterialContext,
  options: PrimitiveOptions,
): Finding[] {
  const findings: Finding[] = [];
  for (const scene of findScenes(doc)) {
    const material = analyseScene(ctx, scene);
    const real = material.real.length;
    const prim = material.primitives.length;
    const at = (partial: Pick<Finding, "rule" | "severity" | "message" | "fix">): Finding =>
      sceneFinding(doc, scene.root, scene.selector, partial);

    if (real === 0 && prim > 0) {
      findings.push(
        at({
          rule: "primitive-aesthetic",
          severity: "error",
          message: `Scene has ${prim} decorative shape(s) and no real material (image, video, licensed illustration, lottie, 3D or textured background).`,
          fix: "Replace the shapes with a real photo, video or illustration (reelcraft assets search) and keep shapes only as accents.",
        }),
      );
    } else if (real === 0) {
      findings.push(
        at({
          rule: "no-real-material",
          severity: "warning",
          message:
            "Scene has no real material (image, video, licensed illustration, lottie, 3D or textured background).",
          fix: "Add an image, video or textured background that carries the idea of the scene, or make the type itself the subject on purpose.",
        }),
      );
    } else if (
      prim >= options.minPrimitivesForRatio &&
      prim / (prim + real) > options.maxPrimitiveRatio
    ) {
      findings.push(
        at({
          rule: "primitive-ratio",
          severity: "warning",
          message: `Decorative shapes are ${prim} of ${prim + real} visual elements (limit ${Math.round(options.maxPrimitiveRatio * 100)}%).`,
          fix: "Remove or merge shapes, or add more real material so the scene is not carried by circles and rounded boxes.",
        }),
      );
    }

    if (!material.hasDepth) {
      const colour = sceneBackgroundColor(ctx, scene);
      findings.push(
        at({
          rule: "flat-background",
          severity: "warning",
          message: `Background is a single flat colour${colour ? ` (${colour})` : ""} with no texture, gradient or image.`,
          fix: "Add a gradient, grain/noise texture, photo or video behind the content to give the scene depth.",
        }),
      );
    }
  }
  return findings;
}

function motionFindings(doc: HtmlDocument): Finding[] {
  const tweens = inlineScripts(doc).flatMap((script) => parseTweens(script));
  if (!isUniformMotion(tweens)) return [];
  const first = tweens[0];
  const sample = first ? `ease "${first.ease}", duration ${String(first.duration)}s` : "";
  return [
    {
      rule: "uniform-motion",
      severity: "warning",
      file: doc.file,
      selector: "gsap timeline",
      message: `All ${tweens.length} tweens use the same easing and duration (${sample}).`,
      fix: "Vary ease and duration by role (fast entrances, slower settles, a different curve for the hero element).",
    },
  ];
}

/** The primitive-aesthetic detector for one composition file. */
export function checkPrimitiveAesthetic(
  doc: HtmlDocument,
  options: PrimitiveOptions = DEFAULT_PRIMITIVE_OPTIONS,
): Finding[] {
  const ctx = makeContext(doc, options);
  return [...materialFindings(doc, ctx, options), ...motionFindings(doc)];
}
