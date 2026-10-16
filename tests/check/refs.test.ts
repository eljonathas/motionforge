import { describe, expect, it } from "vitest";
import { loadHtml } from "../../src/check/document.js";
import { collectRefs, resolveLocal } from "../../src/check/refs.js";

const refsOf = (html: string) =>
  collectRefs(loadHtml("compositions/a.html", html)).map((r) => [r.kind, r.url]);

describe("collectRefs", () => {
  it("collects media attributes, srcset, poster, source and svg image", () => {
    expect(
      refsOf(`<img src="a.jpg" srcset="b.jpg 1x, c.jpg 2x"><video poster="p.png"><source src="v.mp4"></video>
              <audio><source src="s.mp3"></audio><svg><image href="i.png"/></svg>`),
    ).toEqual([
      ["img", "a.jpg"],
      ["img", "b.jpg"],
      ["img", "c.jpg"],
      ["poster", "p.png"],
      ["video", "v.mp4"],
      ["audio", "s.mp3"],
      ["svg-image", "i.png"],
    ]);
  });

  it("collects css url() from <style>, inline style and @font-face, with the declaring rule as selector", () => {
    const doc = loadHtml(
      "a.html",
      `<style>@font-face{font-family:X;src:url(fonts/x.woff2)} .hero{background:url("assets/t.png")}</style>
       <div id="d" style="background-image:url(assets/u.png)"></div>`,
    );
    expect(collectRefs(doc).map((r) => [r.url, r.selector])).toEqual([
      ["fonts/x.woff2", "@font-face"],
      ["assets/t.png", ".hero"],
      ["assets/u.png", "#d"],
    ]);
  });

  it("collects lottie paths with their container", () => {
    const doc = loadHtml(
      "a.html",
      `<div id="l"></div><script>lottie.loadAnimation({ container: document.getElementById("l"), path: "assets/a.json", loop: true })</script>`,
    );
    expect(collectRefs(doc)).toEqual([
      { kind: "lottie", url: "assets/a.json", selector: "#l", line: undefined },
    ]);
  });

  it("ignores the stylesheet/script distinction for links and reads scripts as script refs", () => {
    expect(
      refsOf(
        '<link rel="stylesheet" href="x.css"><link rel="preconnect" href="https://a.test"><script src="v.js"></script>',
      ),
    ).toEqual([
      ["stylesheet", "x.css"],
      ["script", "v.js"],
    ]);
  });
});

describe("resolveLocal", () => {
  it("resolves relative, parent and root-absolute paths against the project root", () => {
    expect(resolveLocal("compositions/a.html", "../assets/p.jpg")).toBe("assets/p.jpg");
    expect(resolveLocal("compositions/a.html", "./p.jpg?x=1#y")).toBe("compositions/p.jpg");
    expect(resolveLocal("compositions/a.html", "/assets/p.jpg")).toBe("assets/p.jpg");
    expect(resolveLocal("index.html", "assets/my%20photo.jpg")).toBe("assets/my photo.jpg");
  });

  it("returns undefined for remote, data and fragment URLs", () => {
    for (const url of [
      "https://a.test/x.png",
      "//a.test/x.png",
      "data:image/png;base64,AA",
      "#id",
      "",
    ]) {
      expect(resolveLocal("index.html", url)).toBeUndefined();
    }
  });
});
