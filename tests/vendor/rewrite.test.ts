import { describe, expect, it } from "vitest";
import { rewriteCdnRefs } from "../../src/vendor/rewrite.js";

const html = `<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
<link href="https://fonts.googleapis.com/css2?family=Inter" rel="stylesheet">
<script src='https://unpkg.com/some-lib@1.0.0/x.js'></script>
<p>see https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js, thanks</p>`;

describe("rewriteCdnRefs", () => {
  it("replaces resolvable URLs everywhere and leaves the rest untouched", () => {
    const result = rewriteCdnRefs(html, (ref) =>
      ref.pkg === "gsap"
        ? { kind: "local", path: "./vendor/gsap.min.js" }
        : { kind: "unsupported", reason: "nope" },
    );

    expect(result.html).toContain('<script src="./vendor/gsap.min.js"></script>');
    expect(result.html).toContain("see ./vendor/gsap.min.js, thanks");
    expect(result.html).toContain("fonts.googleapis.com/css2?family=Inter");
    expect(result.replaced).toHaveLength(1);
    expect(result.skipped.map((s) => s.url)).toEqual([
      "https://fonts.googleapis.com/css2?family=Inter",
      "https://unpkg.com/some-lib@1.0.0/x.js",
    ]);
  });

  it("returns the document unchanged when there is no CDN reference", () => {
    const plain = '<script src="./vendor/gsap.min.js"></script>';
    const result = rewriteCdnRefs(plain, () => ({ kind: "unsupported", reason: "x" }));
    expect(result).toEqual({ html: plain, replaced: [], skipped: [] });
  });
});
