import { describe, expect, it } from "vitest";
import { OpenverseProvider } from "../../src/assets/providers/openverse.js";
import { PexelsProvider } from "../../src/assets/providers/pexels.js";
import { ProviderRegistry } from "../../src/assets/registry.js";
import { readLedger } from "../../src/assets/ledger.js";
import { runCli } from "../helpers/cli.js";
import { FakeDownloader, FixtureHttp } from "../helpers/fixture-http.js";
import { makeProject } from "../helpers/tmp.js";

const http = new FixtureHttp({
  "https://api.openverse.org/v1/images/?q=forest&page_size=3&category=photograph&license_type=commercial%2Cmodification":
    "openverse/images.json",
  "https://api.pexels.com/v1/photos/2014422": "pexels/photo.json",
});
const registry = new ProviderRegistry([new OpenverseProvider(http), new PexelsProvider(http, "k")]);

describe("motionforge assets", () => {
  it("prints candidates with provider:id, licence and source", async () => {
    const run = await runCli(
      [
        "assets",
        "search",
        "--kind",
        "photo",
        "--q",
        "forest",
        "--provider",
        "openverse",
        "--limit",
        "3",
      ],
      { registry },
    );

    expect(run.stdout).toContain(
      "openverse:4bc43a04-ef46-4544-a0c1-63c63f56e276  [photo] Misty forest by Jane Doe  (CC BY 4.0)",
    );
    expect(run.stdout).toContain("https://www.flickr.com/photos/example/123");
  });

  it("downloads with get and records the licence in the project", async () => {
    const dir = await makeProject({ "assets/LICENCAS.json": "[]" });
    const downloader = new FakeDownloader();

    const run = await runCli(["assets", "get", "pexels:2014422", "--dir", dir], {
      registry,
      downloader,
      now: () => new Date("2026-10-16T00:00:00.000Z"),
    });

    expect(run.stdout).toContain("saved assets/photo/pexels-2014422.jpg");
    expect(run.stdout).toContain("recorded in assets/LICENCAS.json");
    expect((await readLedger(dir))[0]?.license).toBe("Pexels License");
  });

  it("rejects an unknown kind", async () => {
    await expect(
      runCli(["assets", "search", "--kind", "gif", "--q", "x"], { registry }),
    ).rejects.toThrow(/Unknown asset kind/);
  });
});
