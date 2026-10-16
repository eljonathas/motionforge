import { describe, expect, it } from "vitest";
import { OpenverseProvider } from "../../src/assets/providers/openverse.js";
import { PexelsProvider } from "../../src/assets/providers/pexels.js";
import { PolyHavenProvider } from "../../src/assets/providers/polyhaven.js";
import {
  createDefaultRegistry,
  parseKind,
  ProviderRegistry,
  searchAssets,
} from "../../src/assets/registry.js";
import { FixtureHttp } from "../helpers/fixture-http.js";

const PHOTOS = "https://api.pexels.com/v1/search?query=rocks&per_page=10";
const OPENVERSE =
  "https://api.openverse.org/v1/images/?q=rocks&page_size=10&category=photograph&license_type=commercial%2Cmodification";

function registry(http: FixtureHttp, options: { withKey?: boolean } = {}) {
  const key = options.withKey === false ? undefined : "k";
  return new ProviderRegistry([
    new OpenverseProvider(http),
    new PolyHavenProvider(http),
    new PexelsProvider(http, key),
  ]);
}

describe("ProviderRegistry", () => {
  it("lists providers by kind and narrows by name", () => {
    const r = registry(new FixtureHttp({}));
    expect(r.forKind("photo").map((p) => p.name)).toEqual(["openverse", "pexels"]);
    expect(r.forKind("hdri").map((p) => p.name)).toEqual(["polyhaven"]);
    expect(r.forKind("photo", "pexels").map((p) => p.name)).toEqual(["pexels"]);
  });

  it("explains unknown providers, unsupported kinds and kinds nobody serves", () => {
    const r = registry(new FixtureHttp({}));
    expect(() => r.get("nope")).toThrow(/Available providers: openverse, polyhaven, pexels/);
    expect(() => r.forKind("hdri", "pexels")).toThrow(/pexels provides: photo, video/);
    expect(() => r.forKind("icon")).toThrow(/No provider is available/);
    expect(() => parseKind("gif")).toThrow(/Use one of: photo/);
  });

  it("reads PEXELS_API_KEY from the environment", async () => {
    const http = new FixtureHttp({});
    const withKey = createDefaultRegistry(http, { PEXELS_API_KEY: " abc " });
    await expect(withKey.get("pexels").search({ kind: "photo", q: "x", limit: 1 })).rejects.toThrow(
      /404/,
    );
    expect(http.requests[0]?.headers).toEqual({ authorization: "abc" });
    const without = createDefaultRegistry(new FixtureHttp({}), {});
    await expect(without.get("pexels").search({ kind: "photo", q: "x", limit: 1 })).rejects.toThrow(
      /PEXELS_API_KEY/,
    );
  });
});

describe("searchAssets", () => {
  it("merges providers and reports the ones that failed instead of hiding all results", async () => {
    const http = new FixtureHttp({ [OPENVERSE]: "openverse/images.json" });

    const { results, problems } = await searchAssets(registry(http, { withKey: false }), {
      kind: "photo",
      q: "rocks",
    });

    expect(results.map((r) => r.provider)).toEqual(["openverse", "openverse"]);
    expect(problems).toEqual([expect.stringMatching(/^pexels: Pexels needs an API key/)]);
  });

  it("throws when the provider was named explicitly and fails", async () => {
    await expect(
      searchAssets(registry(new FixtureHttp({}), { withKey: false }), {
        kind: "photo",
        q: "x",
        provider: "pexels",
      }),
    ).rejects.toThrow(/needs an API key/);
  });

  it("combines results in provider order", async () => {
    const http = new FixtureHttp({
      [OPENVERSE]: "openverse/images.json",
      [PHOTOS]: "pexels/photos.json",
    });
    const { results, problems } = await searchAssets(registry(http), { kind: "photo", q: "rocks" });
    expect(results.map((r) => r.provider)).toEqual(["openverse", "openverse", "pexels", "pexels"]);
    expect(problems).toEqual([]);
  });
});
