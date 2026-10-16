import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { vendorProject } from "../../src/vendor/vendor.js";
import { makeProject } from "../helpers/tmp.js";

const GSAP = "https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js";

describe("vendorProject", () => {
  it("copies GSAP into vendor/ and rewrites the script tag relative to each file", async () => {
    const dir = await makeProject({
      "index.html": `<script src="${GSAP}"></script>`,
      "compositions/intro.html": `<template><script src="${GSAP}"></script></template>`,
    });

    const report = await vendorProject(dir);

    expect(await readFile(path.join(dir, "index.html"), "utf8")).toContain(
      'src="./vendor/gsap.min.js"',
    );
    expect(await readFile(path.join(dir, "compositions/intro.html"), "utf8")).toContain(
      'src="../vendor/gsap.min.js"',
    );
    expect((await readFile(path.join(dir, "vendor/gsap.min.js"), "utf8")).length).toBeGreaterThan(
      10_000,
    );
    expect(report.copied).toEqual(["vendor/gsap.min.js"]);
    expect(report.replacedCount).toBe(2);
  });

  it("vendors the other known libraries from cdnjs and unpkg", async () => {
    const dir = await makeProject({
      "a.html": [
        '<script src="https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie.min.js"></script>',
        '<script src="https://unpkg.com/animejs@4.0.0/dist/bundles/anime.umd.min.js"></script>',
        '<script type="module">import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";</script>',
        '<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js"></script>',
      ].join("\n"),
    });

    const report = await vendorProject(dir);

    expect(report.skippedCount).toBe(0);
    expect(report.copied).toEqual([
      "vendor/ScrollTrigger.min.js",
      "vendor/anime.umd.min.js",
      "vendor/lottie.min.js",
      "vendor/three/three.core.js",
      "vendor/three/three.module.js",
    ]);
    const html = await readFile(path.join(dir, "a.html"), "utf8");
    expect(html).toContain('"./vendor/three/three.module.js"');
  });

  it("reports what it cannot vendor: unknown libraries, other majors, addons and Google Fonts", async () => {
    const dir = await makeProject({
      "a.html": [
        '<script src="https://cdn.jsdelivr.net/npm/left-pad@1.3.0/index.js"></script>',
        '<script src="https://cdnjs.cloudflare.com/ajax/libs/animejs/3.2.1/anime.min.js"></script>',
        '<script type="module">import { GLTFLoader } from "https://unpkg.com/three@0.160.0/examples/jsm/loaders/GLTFLoader.js";</script>',
        '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter">',
      ].join("\n"),
    });
    const before = await readFile(path.join(dir, "a.html"), "utf8");

    const report = await vendorProject(dir);

    expect(report.replacedCount).toBe(0);
    expect(report.skippedCount).toBe(4);
    expect(report.files[0]?.skipped.map((s) => s.reason).join("\n")).toMatch(
      /not compatible with the bundled/,
    );
    expect(await readFile(path.join(dir, "a.html"), "utf8")).toBe(before);
  });

  it("does nothing when the project has no CDN references", async () => {
    const dir = await makeProject({ "index.html": '<script src="./vendor/gsap.min.js"></script>' });
    expect(await vendorProject(dir)).toMatchObject({ files: [], copied: [], replacedCount: 0 });
  });
});
