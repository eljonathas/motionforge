import { describe, expect, it } from "vitest";
import { loadHtml } from "../../src/check/document.js";
import { checkNetwork } from "../../src/check/network.js";
import { collectRefs } from "../../src/check/refs.js";

function run(html: string) {
  const doc = loadHtml("index.html", html);
  return checkNetwork(doc, collectRefs(doc));
}

describe("checkNetwork", () => {
  it("flags remote scripts, stylesheets, media and css url()", () => {
    const findings = run(`
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter">
      <script src="https://cdn.jsdelivr.net/npm/gsap@3/dist/gsap.min.js"></script>
      <img src="//images.example.com/a.jpg">
      <div style="background:url('https://example.com/bg.png')"></div>
      <style>.a{background-image:url(https://example.com/x.png)}</style>`);

    expect(findings.map((f) => f.rule)).toEqual(Array(5).fill("remote-url"));
    expect(findings.every((f) => f.severity === "error")).toBe(true);
    expect(findings[0]?.fix).toMatch(/motionforge vendor/);
  });

  it("suggests downloading when the URL is not a known CDN", () => {
    expect(run('<img src="https://images.example.com/a.jpg">')[0]?.fix).toMatch(/assets get/);
  });

  it("flags URLs fetched from inline scripts and import maps, not comments or XML namespaces", () => {
    const findings = run(`
      <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"></svg>
      <a href="https://example.com/docs">docs</a>
      <script type="importmap">{"imports":{"three":"https://unpkg.com/three@0.160.0/build/three.module.js"}}</script>
      <script>
        // reference: https://gsap.com/docs
        fetch("https://api.example.com/data.json");
        const ns = "http://www.w3.org/2000/svg";
      </script>`);

    expect(findings.map((f) => f.message.match(/https:\/\/\S+(?=:)/)?.[0])).toEqual([
      "https://unpkg.com/three@0.160.0/build/three.module.js",
      "https://api.example.com/data.json",
    ]);
  });

  it("accepts a fully local composition", () => {
    expect(
      run('<script src="./vendor/gsap.min.js"></script><img src="assets/photo/a.jpg">'),
    ).toEqual([]);
  });
});
