import { describe, expect, it } from "vitest";
import { OpenverseProvider } from "../../../src/assets/providers/openverse.js";
import { FixtureHttp } from "../../helpers/fixture-http.js";

const IMAGES =
  "https://api.openverse.org/v1/images/?q=forest&page_size=5&category=photograph&license_type=commercial%2Cmodification";

describe("OpenverseProvider (recorded fixtures, not verified against the live API)", () => {
  it("asks only for commercial-use, modifiable licences by default and maps results", async () => {
    const http = new FixtureHttp({ [IMAGES]: "openverse/images.json" });

    const results = await new OpenverseProvider(http).search({
      kind: "photo",
      q: "forest",
      limit: 5,
    });

    expect(http.requests[0]?.url).toBe(IMAGES);
    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({
      provider: "openverse",
      id: "4bc43a04-ef46-4544-a0c1-63c63f56e276",
      kind: "photo",
      title: "Misty forest",
      author: "Jane Doe",
      author_url: "https://www.flickr.com/photos/example",
      source_url: "https://www.flickr.com/photos/example/123",
      thumbnail_url:
        "https://api.openverse.org/v1/images/4bc43a04-ef46-4544-a0c1-63c63f56e276/thumb/",
      license: "CC BY 4.0",
      license_url: "https://creativecommons.org/licenses/by/4.0/",
      attribution_required: true,
      attribution_text: '"Misty forest" by Jane Doe is licensed under CC BY 4.0.',
    });
  });

  it("treats CC0 as not requiring attribution and tolerates null fields", async () => {
    const http = new FixtureHttp({ [IMAGES]: "openverse/images.json" });
    const [, cc0] = await new OpenverseProvider(http).search({
      kind: "photo",
      q: "forest",
      limit: 5,
    });
    expect(cc0).toMatchObject({
      license: "CC0 1.0",
      attribution_required: false,
      author: "",
      title: "0aa11bb2-0000-4000-8000-123456789abc",
    });
  });

  it("drops the licence filter only when the caller opts in", async () => {
    const url = "https://api.openverse.org/v1/images/?q=forest&page_size=5&category=photograph";
    const http = new FixtureHttp({ [url]: "openverse/images.json" });
    await new OpenverseProvider(http).search({
      kind: "photo",
      q: "forest",
      limit: 5,
      anyLicense: true,
    });
    expect(http.requests[0]?.url).toBe(url);
  });

  it("searches the audio endpoint for sound effects", async () => {
    const url =
      "https://api.openverse.org/v1/audio/?q=door&page_size=3&category=sound_effect&license_type=commercial%2Cmodification";
    const http = new FixtureHttp({ [url]: "openverse/audio.json" });
    const [sfx] = await new OpenverseProvider(http).search({ kind: "sfx", q: "door", limit: 3 });
    expect(sfx).toMatchObject({ kind: "sfx", license: "CC BY 3.0", title: "Door slam" });
  });

  it("rejects kinds it does not serve with the list of supported ones", async () => {
    await expect(
      new OpenverseProvider(new FixtureHttp({})).search({ kind: "video", q: "x", limit: 1 }),
    ).rejects.toThrow(/does not provide "video"/);
  });

  it("resolves an image id to a download with a stable file name", async () => {
    const id = "4bc43a04-ef46-4544-a0c1-63c63f56e276";
    const http = new FixtureHttp({
      [`https://api.openverse.org/v1/images/${id}/`]: "openverse/image-detail.json",
    });
    const resolved = await new OpenverseProvider(http).resolve(id);
    expect(resolved.files).toEqual([
      { url: "https://live.staticflickr.com/65535/123_abc_b.jpg", name: `openverse-${id}.jpg` },
    ]);
    expect(resolved.candidate.kind).toBe("photo");
  });

  it("falls back to the audio endpoint when the id is not an image", async () => {
    const id = "9f8e7d6c-1111-4222-8333-444455556666";
    const http = new FixtureHttp({
      [`https://api.openverse.org/v1/audio/${id}/`]: "openverse/audio-detail.json",
    });
    const resolved = await new OpenverseProvider(http).resolve(id);
    expect(resolved.candidate).toMatchObject({ kind: "sfx", license: "CC BY 3.0" });
    expect(resolved.files[0]?.name).toBe(`openverse-${id}.mp3`);
  });

  it("explains an unknown id", async () => {
    await expect(new OpenverseProvider(new FixtureHttp({})).resolve("nope")).rejects.toThrow(
      /no image or audio with id nope/,
    );
  });
});
