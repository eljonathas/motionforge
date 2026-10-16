import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getAsset, parseAssetRef } from "../../src/assets/get.js";
import { readLedger } from "../../src/assets/ledger.js";
import { OpenverseProvider } from "../../src/assets/providers/openverse.js";
import { PexelsProvider } from "../../src/assets/providers/pexels.js";
import { PolyHavenProvider } from "../../src/assets/providers/polyhaven.js";
import { ProviderRegistry } from "../../src/assets/registry.js";
import type { AssetProvider, FileDownloader } from "../../src/assets/types.js";
import { checkProject } from "../../src/check/run.js";
import { FakeDownloader, FixtureHttp } from "../helpers/fixture-http.js";
import { makeProject } from "../helpers/tmp.js";

const NOW = new Date("2026-10-16T12:00:00.000Z");
const BASE = "https://api.polyhaven.com";

function setup() {
  const http = new FixtureHttp({
    "https://api.pexels.com/v1/photos/2014422": "pexels/photo.json",
    [`${BASE}/info/wooden_crate_02`]: "polyhaven/info-wooden_crate_02.json",
    [`${BASE}/files/wooden_crate_02`]: "polyhaven/files-wooden_crate_02.json",
    "https://api.openverse.org/v1/images/4bc43a04-ef46-4544-a0c1-63c63f56e276/":
      "openverse/image-detail.json",
  });
  const downloader = new FakeDownloader();
  const registry = new ProviderRegistry([
    new OpenverseProvider(http),
    new PolyHavenProvider(http),
    new PexelsProvider(http, "k"),
  ]);
  return { deps: { registry, downloader, now: () => NOW }, downloader };
}

describe("getAsset", () => {
  it("downloads into assets/<kind>/ and appends the full licence entry", async () => {
    const dir = await makeProject({ "assets/LICENCAS.json": "[]" });
    const { deps, downloader } = setup();

    const result = await getAsset(dir, "pexels:2014422", deps);

    expect(downloader.downloads[0]?.destination).toBe(
      path.join(dir, "assets", "photo", "pexels-2014422.jpg"),
    );
    expect(await readFile(path.join(dir, "assets/photo/pexels-2014422.jpg"), "utf8")).toContain(
      "fake:",
    );
    expect(await readLedger(dir)).toEqual([
      {
        file: "assets/photo/pexels-2014422.jpg",
        provider: "pexels",
        id: "2014422",
        title: "Brown Rocks During Golden Hour",
        author: "Joey Farina",
        author_url: "https://www.pexels.com/@joey",
        source_url: "https://www.pexels.com/photo/brown-rock-formation-2014422/",
        license: "Pexels License",
        license_url: "https://www.pexels.com/license/",
        attribution_required: false,
        attribution_text: "Photo by Joey Farina on Pexels",
        downloaded_at: "2026-10-16T12:00:00.000Z",
      },
    ]);
    expect(result.entries).toHaveLength(1);
  });

  it("puts multi-file models in their own folder and licenses every file, so check passes", async () => {
    const dir = await makeProject({ "assets/LICENCAS.json": "[]" });
    const { deps } = setup();

    const { entries } = await getAsset(dir, "polyhaven:wooden_crate_02", deps);

    expect(entries.map((e) => e.file)).toEqual([
      "assets/model/polyhaven-wooden_crate_02/wooden_crate_02.gltf",
      "assets/model/polyhaven-wooden_crate_02/wooden_crate_02.bin",
      "assets/model/polyhaven-wooden_crate_02/textures/wooden_crate_02_diff_1k.jpg",
    ]);
    expect(entries.every((e) => e.license === "CC0 1.0")).toBe(true);
    const report = await checkProject(dir);
    expect(report.findings.filter((f) => f.rule.startsWith("license"))).toEqual([]);
  });

  it("records attribution requirements from the provider", async () => {
    const dir = await makeProject({});
    const { deps } = setup();
    const { entries } = await getAsset(dir, "openverse:4bc43a04-ef46-4544-a0c1-63c63f56e276", deps);
    expect(entries[0]).toMatchObject({
      license: "CC BY 4.0",
      attribution_required: true,
      attribution_text: expect.stringContaining("Jane Doe") as string,
    });
  });

  it("does not write a licence entry when the download fails", async () => {
    const dir = await makeProject({ "assets/LICENCAS.json": "[]" });
    const failing: FileDownloader = { download: () => Promise.reject(new Error("offline")) };
    const { deps } = setup();

    await expect(getAsset(dir, "pexels:2014422", { ...deps, downloader: failing })).rejects.toThrow(
      "offline",
    );
    expect(await readLedger(dir)).toEqual([]);
  });

  it("refuses provider file names that escape assets/", async () => {
    const dir = await makeProject({});
    const evil: AssetProvider = {
      name: "evil",
      kinds: ["photo"],
      search: () => Promise.resolve([]),
      resolve: async () => {
        const { candidate } = await new PexelsProvider(
          new FixtureHttp({ "https://api.pexels.com/v1/photos/2014422": "pexels/photo.json" }),
          "k",
        ).resolve("2014422");
        return { candidate, files: [{ url: "https://x.test/a", name: "../../outside.txt" }] };
      },
    };
    const { deps } = setup();
    await expect(
      getAsset(dir, "evil:1", { ...deps, registry: new ProviderRegistry([evil]) }),
    ).rejects.toThrow(/outside assets/);
  });
});

describe("parseAssetRef", () => {
  it("splits provider and id at the first colon", () => {
    expect(parseAssetRef("openverse:abc:def")).toEqual({ provider: "openverse", id: "abc:def" });
  });

  it("rejects malformed references with an example", () => {
    for (const bad of ["pexels", ":1", "pexels:"])
      expect(() => parseAssetRef(bad)).toThrow(/<provider>:<id>/);
  });
});
