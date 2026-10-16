import { describe, expect, it } from "vitest";
import { PolyHavenProvider } from "../../../src/assets/providers/polyhaven.js";
import { FixtureHttp } from "../../helpers/fixture-http.js";

const BASE = "https://api.polyhaven.com";

describe("PolyHavenProvider (recorded fixtures, not verified against the live API)", () => {
  it("filters the listing by every query word across id, name, tags and categories", async () => {
    const http = new FixtureHttp({ [`${BASE}/assets?t=textures`]: "polyhaven/textures.json" });

    const results = await new PolyHavenProvider(http).search({
      kind: "texture",
      q: "brick wall",
      limit: 10,
    });

    expect(results.map((r) => r.id)).toEqual(["brick_wall_001", "red_brick_03"]);
    expect(results[0]).toMatchObject({
      provider: "polyhaven",
      kind: "texture",
      title: "Brick Wall 001",
      author: "Rob Tuytel",
      source_url: "https://polyhaven.com/a/brick_wall_001",
      license: "CC0 1.0",
      license_url: "https://creativecommons.org/publicdomain/zero/1.0/",
      attribution_required: false,
    });
    expect(results[1]?.author).toBe("Dimitrios Savva, Rob Tuytel");
  });

  it("respects the limit and returns nothing when no word matches", async () => {
    const http = new FixtureHttp({ [`${BASE}/assets?t=textures`]: "polyhaven/textures.json" });
    const provider = new PolyHavenProvider(http);
    expect(await provider.search({ kind: "texture", q: "brick", limit: 1 })).toHaveLength(1);
    expect(await provider.search({ kind: "texture", q: "zebra", limit: 5 })).toEqual([]);
  });

  it("uses the hdris and models listings for those kinds, and rejects other kinds", async () => {
    const http = new FixtureHttp({});
    const provider = new PolyHavenProvider(http);
    await expect(provider.search({ kind: "hdri", q: "sky", limit: 1 })).rejects.toThrow(/404/);
    expect(http.requests[0]?.url).toBe(`${BASE}/assets?t=hdris`);
    await expect(provider.search({ kind: "photo", q: "x", limit: 1 })).rejects.toThrow(
      /does not provide "photo"/,
    );
  });

  it("resolves a texture to its 2k diffuse jpg", async () => {
    const http = new FixtureHttp({
      [`${BASE}/info/brick_wall_001`]: "polyhaven/info-brick_wall_001.json",
      [`${BASE}/files/brick_wall_001`]: "polyhaven/files-brick_wall_001.json",
    });
    const resolved = await new PolyHavenProvider(http).resolve("brick_wall_001");
    expect(resolved.candidate.kind).toBe("texture");
    expect(resolved.files).toEqual([
      {
        url: "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/brick_wall_001/brick_wall_001_diff_2k.jpg",
        name: "polyhaven-brick_wall_001.jpg",
      },
    ]);
  });

  it("resolves an HDRI to its 2k .hdr file", async () => {
    const id = "kloofendal_48d_partly_cloudy";
    const http = new FixtureHttp({
      [`${BASE}/info/${id}`]: `polyhaven/info-${id}.json`,
      [`${BASE}/files/${id}`]: `polyhaven/files-${id}.json`,
    });
    const resolved = await new PolyHavenProvider(http).resolve(id);
    expect(resolved.candidate.kind).toBe("hdri");
    expect(resolved.files.map((f) => f.name)).toEqual([`polyhaven-${id}.hdr`]);
    expect(resolved.files[0]?.url).toContain("/2k/");
  });

  it("resolves a model to the gltf plus every file it includes", async () => {
    const id = "wooden_crate_02";
    const http = new FixtureHttp({
      [`${BASE}/info/${id}`]: `polyhaven/info-${id}.json`,
      [`${BASE}/files/${id}`]: `polyhaven/files-${id}.json`,
    });
    const resolved = await new PolyHavenProvider(http).resolve(id);
    expect(resolved.candidate.kind).toBe("model");
    expect(resolved.files.map((f) => f.name)).toEqual([
      `${id}.gltf`,
      `${id}.bin`,
      "textures/wooden_crate_02_diff_1k.jpg",
    ]);
  });
});
