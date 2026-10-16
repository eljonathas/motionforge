import { describe, expect, it } from "vitest";
import { loadHtml } from "../../src/check/document.js";
import { checkPrimitiveAesthetic, DEFAULT_PRIMITIVE_OPTIONS } from "../../src/check/primitives.js";

function run(body: string, head = "", licensed: string[] = []) {
  const html = `<!doctype html><html><head><style>body{background:#111}</style>${head}</head><body>${body}</body></html>`;
  return checkPrimitiveAesthetic(loadHtml("scene.html", html), {
    ...DEFAULT_PRIMITIVE_OPTIONS,
    licensed: new Set(licensed),
  });
}

const rules = (findings: { rule: string }[]) => findings.map((f) => f.rule).sort();

const GRADIENT = "<style>body{background:linear-gradient(#123,#456)}</style>";

describe("primitive aesthetic detector", () => {
  it("errors on a scene made only of circles and rounded boxes", () => {
    const findings = run(`
      <div class="scene" id="s1">
        <div style="border-radius:50%;background:#f43;width:80px;height:80px"></div>
        <div style="border-radius:50%;background:#4f3;width:80px;height:80px"></div>
        <div style="border-radius:12px;background:#34f;width:200px;height:40px"></div>
      </div>`);

    const error = findings.find((f) => f.rule === "primitive-aesthetic");
    expect(error).toMatchObject({ severity: "error", file: "scene.html", selector: "#s1" });
    expect(error?.fix).toMatch(/assets search/);
    expect(error?.message).toContain("3 decorative shape");
  });

  it("accepts a scene whose idea is carried by a photo on a textured background", () => {
    const findings = run(
      `<div class="scene"><img src="assets/photo/pexels-1.jpg" alt=""><h1>Title</h1></div>`,
      GRADIENT,
    );
    expect(findings).toEqual([]);
  });

  it("flags a high primitive ratio even when some real material exists", () => {
    const dots = Array.from(
      { length: 5 },
      () => `<div style="border-radius:50%;background:#fff;width:9px;height:9px"></div>`,
    ).join("");
    const findings = run(`<div class="scene"><img src="a.jpg">${dots}</div>`, GRADIENT);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ rule: "primitive-ratio", severity: "warning" });
  });

  it("does not judge the ratio below the minimum number of shapes", () => {
    const findings = run(
      `<div class="scene"><img src="a.jpg"><div style="border-radius:50%;background:#fff;width:9px;height:9px"></div></div>`,
      GRADIENT,
    );
    expect(findings).toEqual([]);
  });

  it("does not count rounded elements that hold text or media as primitives", () => {
    const findings = run(
      `<div class="scene">
         <div style="border-radius:16px;background:#fff"><p>Quote</p></div>
         <div style="border-radius:16px;background:#fff"><img src="a.jpg"></div>
       </div>`,
      GRADIENT,
    );
    expect(rules(findings)).toEqual([]);
  });

  it("applies <style> rules, including classes, when judging shapes", () => {
    const findings = run(
      `<div class="scene"><i class="dot"></i><i class="dot"></i></div>`,
      `<style>.dot{border-radius:50%;background:#f00;width:10px;height:10px}</style>`,
    );
    expect(rules(findings)).toContain("primitive-aesthetic");
  });

  it("treats inline svg made only of basic shapes as a primitive, but not svg with paths or text", () => {
    const onlyShapes = run(
      `<div class="scene"><svg><circle r="4"/><rect width="3" height="3"/></svg></div>`,
    );
    const withPath = run(`<div class="scene"><svg><path d="M0 0L9 9"/><circle r="4"/></svg></div>`);
    const chart = run(
      `<div class="scene"><svg><rect width="3" height="3"/><text>42</text></svg></div>`,
    );

    expect(rules(onlyShapes)).toContain("primitive-aesthetic");
    expect(rules(withPath)).not.toContain("primitive-aesthetic");
    expect(rules(chart)).not.toContain("primitive-aesthetic");
  });

  it("counts backgrounds from url(), video, lottie containers and 3D canvases as real material", () => {
    const bg = run(
      `<div class="scene" style="background:url(assets/texture/paper.jpg)"><h1>x</h1></div>`,
    );
    const video = run(
      `<div class="scene"><video src="assets/video/a.mp4"></video></div>`,
      GRADIENT,
    );
    const lottie = run(
      `<div class="scene"><div id="anim"></div></div><script>lottie.loadAnimation({container: document.getElementById('anim'), path: 'assets/a.json'})</script>`,
      GRADIENT,
    );
    const threeD = run(
      `<div class="scene"><canvas id="c"></canvas></div><script>new GLTFLoader().load('assets/model/x.glb')</script>`,
      GRADIENT,
    );

    for (const findings of [bg, video, lottie, threeD]) {
      expect(rules(findings)).not.toContain("no-real-material");
      expect(rules(findings)).not.toContain("primitive-aesthetic");
    }
  });

  it("counts an svg illustration file only when it is licensed", () => {
    const body = `<div class="scene"><img src="assets/illustration/people.svg"></div>`;
    expect(rules(run(body, GRADIENT))).toContain("no-real-material");
    expect(rules(run(body, GRADIENT, ["assets/illustration/people.svg"]))).toEqual([]);
  });

  it("warns on a text-only scene instead of erroring", () => {
    const findings = run(`<div class="scene"><h1>Only words</h1></div>`, GRADIENT);
    expect(findings).toEqual([
      expect.objectContaining({ rule: "no-real-material", severity: "warning" }),
    ]);
  });

  it("flags a flat single-colour background and names the colour", () => {
    const findings = run(`<div class="scene"><h1>Hi</h1></div>`);
    const flat = findings.find((f) => f.rule === "flat-background");
    expect(flat?.message).toContain("#111");
  });

  it("does not flag the background when a gradient is inherited from body or a noise filter is used", () => {
    expect(rules(run(`<div class="scene"><h1>Hi</h1></div>`, GRADIENT))).not.toContain(
      "flat-background",
    );
    expect(
      rules(
        run(
          `<div class="scene"><svg><filter id="n"><feTurbulence baseFrequency=".8"/></filter></svg></div>`,
        ),
      ),
    ).not.toContain("flat-background");
  });

  it("judges each scene separately", () => {
    const findings = run(
      `<section class="scene" id="a"><img src="a.jpg"></section>
       <section class="scene" id="b"><div style="border-radius:50%;background:red"></div></section>`,
      GRADIENT,
    );
    expect(findings.filter((f) => f.rule === "primitive-aesthetic").map((f) => f.selector)).toEqual(
      ["#b"],
    );
  });

  it("does not judge a root that only hosts sub-compositions from other files", () => {
    const findings = run(
      `<div data-composition-id="main"><div data-composition-id="intro" data-composition-src="compositions/intro.html"></div></div>`,
    );
    expect(findings).toEqual([]);
  });

  describe("uniform motion", () => {
    const tween = (extra: string) => `tl.to("#a", { x: 10, ${extra} });`;

    it("flags four tweens that all use the same ease and duration", () => {
      const script = `<script>const tl = gsap.timeline();${tween("duration: 0.6, ease: 'power2.out'").repeat(4)}</script>`;
      const findings = run(`<div class="scene"><img src="a.jpg"></div>${script}`, GRADIENT);
      expect(findings).toEqual([
        expect.objectContaining({ rule: "uniform-motion", selector: "gsap timeline" }),
      ]);
    });

    it("flags tweens that rely on GSAP defaults", () => {
      const script = `<script>${"tl.from('#a', { opacity: 0 });".repeat(4)}</script>`;
      expect(rules(run(`<div class="scene"><img src="a.jpg"></div>${script}`, GRADIENT))).toEqual([
        "uniform-motion",
      ]);
    });

    it("accepts varied ease or duration, and too few tweens", () => {
      const varied = [
        tween("duration: 0.6, ease: 'power2.out'"),
        tween("duration: 0.6, ease: 'expo.out'"),
        tween("duration: 0.9, ease: 'power2.out'"),
        tween("duration: 0.6, ease: 'power2.out'"),
      ].join("");
      const few = tween("duration: 0.6").repeat(3);
      const scene = `<div class="scene"><img src="a.jpg"></div>`;
      expect(run(`${scene}<script>${varied}</script>`, GRADIENT)).toEqual([]);
      expect(run(`${scene}<script>${few}</script>`, GRADIENT)).toEqual([]);
    });
  });
});
