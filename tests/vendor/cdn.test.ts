import { describe, expect, it } from "vitest";
import { parseCdnUrl } from "../../src/vendor/cdn.js";

describe("parseCdnUrl", () => {
  it("reads package, version and file from jsdelivr npm URLs", () => {
    const ref = parseCdnUrl("https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js");
    expect(ref).toMatchObject({
      host: "jsdelivr",
      pkg: "gsap",
      version: "3.14.2",
      filePath: "dist/gsap.min.js",
    });
  });

  it("handles scoped packages and missing versions on unpkg", () => {
    expect(parseCdnUrl("https://unpkg.com/@scope/pkg/dist/a.js")).toMatchObject({
      pkg: "@scope/pkg",
      version: undefined,
      filePath: "dist/a.js",
    });
    expect(parseCdnUrl("https://unpkg.com/lottie-web@5.12.2")).toMatchObject({
      pkg: "lottie-web",
      version: "5.12.2",
      filePath: "",
    });
  });

  it("maps cdnjs library names to npm packages", () => {
    expect(
      parseCdnUrl("https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"),
    ).toMatchObject({ host: "cdnjs", pkg: "three", version: "r128", filePath: "three.min.js" });
    expect(
      parseCdnUrl("https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/ScrollTrigger.min.js"),
    ).toMatchObject({ pkg: "gsap", filePath: "ScrollTrigger.min.js" });
  });

  it("accepts protocol-relative URLs and flags Google Fonts", () => {
    expect(
      parseCdnUrl("//cdn.jsdelivr.net/npm/animejs@4.0.0/dist/bundles/anime.umd.min.js")?.pkg,
    ).toBe("animejs");
    expect(parseCdnUrl("https://fonts.googleapis.com/css2?family=Inter")?.host).toBe(
      "google-fonts",
    );
  });

  it("has no package for jsdelivr gh URLs", () => {
    expect(parseCdnUrl("https://cdn.jsdelivr.net/gh/user/repo@1/file.js")?.pkg).toBeUndefined();
  });
});

describe("parseCdnUrl on other hosts", () => {
  it("returns nothing for URLs that are not on a known CDN", () => {
    expect(parseCdnUrl("https://images.example.com/a.jpg")).toBeUndefined();
  });
});
