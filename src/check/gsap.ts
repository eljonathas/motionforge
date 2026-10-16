export interface Tween {
  method: "to" | "from" | "fromTo";
  ease: string;
  duration: number | "dynamic";
}

const GSAP_DEFAULT_EASE = "power1.out";
const GSAP_DEFAULT_DURATION = 0.5;

/** Removes // and block comments while leaving string literals untouched. */
export function stripJsComments(source: string): string {
  let out = "";
  let quote: string | undefined;
  for (let i = 0; i < source.length; i++) {
    const ch = source[i] ?? "";
    const next = source[i + 1];
    if (quote) {
      out += ch;
      if (ch === "\\") out += source[++i] ?? "";
      else if (ch === quote) quote = undefined;
    } else if (ch === "/" && next === "/") {
      while (i < source.length && source[i] !== "\n") i++;
      out += "\n";
    } else if (ch === "/" && next === "*") {
      const end = source.indexOf("*/", i + 2);
      i = end === -1 ? source.length : end + 1;
      out += " ";
    } else {
      if (ch === '"' || ch === "'" || ch === "`") quote = ch;
      out += ch;
    }
  }
  return out;
}

/** Text between the parenthesis opened at `openIndex` and its match, honouring strings. */
function balancedArgs(source: string, openIndex: number): string | undefined {
  let depth = 0;
  let quote: string | undefined;
  for (let i = openIndex; i < source.length; i++) {
    const ch = source[i] ?? "";
    if (quote) {
      if (ch === "\\") i++;
      else if (ch === quote) quote = undefined;
    } else if (ch === '"' || ch === "'" || ch === "`") {
      quote = ch;
    } else if (ch === "(" || ch === "{" || ch === "[") {
      depth++;
    } else if (ch === ")" || ch === "}" || ch === "]") {
      depth--;
      if (depth === 0) return source.slice(openIndex + 1, i);
    }
  }
  return undefined;
}

function splitTopLevel(args: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let quote: string | undefined;
  let start = 0;
  for (let i = 0; i < args.length; i++) {
    const ch = args[i] ?? "";
    if (quote) {
      if (ch === "\\") i++;
      else if (ch === quote) quote = undefined;
    } else if (ch === '"' || ch === "'" || ch === "`") {
      quote = ch;
    } else if ("({[".includes(ch)) {
      depth++;
    } else if (")}]".includes(ch)) {
      depth--;
    } else if (ch === "," && depth === 0) {
      parts.push(args.slice(start, i).trim());
      start = i + 1;
    }
  }
  parts.push(args.slice(start).trim());
  return parts;
}

function timelineDefaults(script: string): { ease: string; duration: number } {
  const block = /defaults\s*:\s*\{([^}]*)\}/.exec(script)?.[1] ?? "";
  const ease = /\bease\s*:\s*(["'`])(.*?)\1/.exec(block)?.[2];
  const duration = /\bduration\s*:\s*([\d.]+)/.exec(block)?.[1];
  return {
    ease: ease ?? GSAP_DEFAULT_EASE,
    duration: duration === undefined ? GSAP_DEFAULT_DURATION : Number(duration),
  };
}

function readDuration(vars: string, fallback: number): number | "dynamic" {
  const match = /\bduration\s*:\s*([^,}\n]+)/.exec(vars);
  if (!match) return fallback;
  const value = Number((match[1] ?? "").trim());
  return Number.isFinite(value) ? value : "dynamic";
}

function readEase(vars: string, fallback: string): string {
  const match = /\bease\s*:\s*([^,}\n]+)/.exec(vars);
  if (!match) return fallback;
  const raw = (match[1] ?? "").trim();
  const literal = /^(["'`])(.*)\1$/.exec(raw);
  return literal ? (literal[2] ?? raw) : `dynamic:${raw}`;
}

/** Extracts `.to/.from/.fromTo` calls with their literal ease and duration (defaults filled in). */
export function parseTweens(script: string): Tween[] {
  const clean = stripJsComments(script);
  const defaults = timelineDefaults(clean);
  const tweens: Tween[] = [];
  for (const call of clean.matchAll(/\.(to|from|fromTo)\s*\(/g)) {
    const method = call[1] as Tween["method"];
    const open = (call.index ?? 0) + call[0].length - 1;
    const args = balancedArgs(clean, open);
    if (args === undefined) continue;
    const vars = splitTopLevel(args)[method === "fromTo" ? 2 : 1];
    if (vars === undefined || !vars.startsWith("{")) continue;
    tweens.push({
      method,
      ease: readEase(vars, defaults.ease),
      duration: readDuration(vars, defaults.duration),
    });
  }
  return tweens;
}

/** True when 4+ tweens exist and every one has the same literal ease and duration. */
export function isUniformMotion(tweens: readonly Tween[], minTweens = 4): boolean {
  if (tweens.length < minTweens) return false;
  if (tweens.some((t) => t.duration === "dynamic" || t.ease.startsWith("dynamic:"))) return false;
  const first = tweens[0];
  return tweens.every((t) => t.ease === first?.ease && t.duration === first.duration);
}
