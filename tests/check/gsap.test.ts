import { describe, expect, it } from "vitest";
import { isUniformMotion, parseTweens, stripJsComments } from "../../src/check/gsap.js";

describe("stripJsComments", () => {
  it("removes comments but keeps URLs inside strings", () => {
    const out = stripJsComments(
      `const a = "http://x.test/a"; // see http://comment.test\n/* http://block.test */ b();`,
    );
    expect(out).toContain("http://x.test/a");
    expect(out).not.toContain("comment.test");
    expect(out).not.toContain("block.test");
  });
});

describe("parseTweens", () => {
  it("reads ease and duration of to, from and fromTo calls", () => {
    const tweens = parseTweens(`
      tl.to("#a", { x: 1, duration: 0.4, ease: "expo.out" }, 0);
      tl.fromTo(".b", { y: 5 }, { y: 0, duration: 1, ease: 'sine.inOut' });
      tl.from("#c", { opacity: 0, duration: 2 });
    `);
    expect(tweens).toEqual([
      { method: "to", ease: "expo.out", duration: 0.4 },
      { method: "fromTo", ease: "sine.inOut", duration: 1 },
      { method: "from", ease: "power1.out", duration: 2 },
    ]);
  });

  it("uses timeline defaults for missing values", () => {
    const [tween] = parseTweens(
      `const tl = gsap.timeline({ defaults: { duration: 0.8, ease: "power4.out" } }); tl.to("#a", { x: 1 });`,
    );
    expect(tween).toEqual({ method: "to", ease: "power4.out", duration: 0.8 });
  });

  it("ignores commented-out tweens and non-gsap calls", () => {
    const tweens = parseTweens(
      `// tl.to("#a", { x: 1 });\nconst xs = Array.from({ length: 3 }, (_, i) => i);`,
    );
    expect(tweens).toEqual([]);
  });

  it("marks computed values as dynamic so they are never reported as uniform", () => {
    const tweens = parseTweens(`${'tl.to("#a", { x: 1, duration: d, ease: pick() });'.repeat(4)}`);
    expect(tweens[0]?.duration).toBe("dynamic");
    expect(isUniformMotion(tweens)).toBe(false);
  });
});
