import { describe, expect, it } from "vitest";
import { pickVideoFile, PexelsProvider } from "../../../src/assets/providers/pexels.js";
import { FixtureHttp } from "../../helpers/fixture-http.js";

const BASE = "https://api.pexels.com";

describe("PexelsProvider (recorded fixtures, not verified against the live API)", () => {
  it("sends the key in the Authorization header and maps photos", async () => {
    const http = new FixtureHttp({
      [`${BASE}/v1/search?query=rocks&per_page=2`]: "pexels/photos.json",
    });

    const results = await new PexelsProvider(http, "secret-key").search({
      kind: "photo",
      q: "rocks",
      limit: 2,
    });

    expect(http.requests[0]?.headers).toEqual({ authorization: "secret-key" });
    expect(results[0]).toEqual({
      provider: "pexels",
      id: "2014422",
      kind: "photo",
      title: "Brown Rocks During Golden Hour",
      author: "Joey Farina",
      author_url: "https://www.pexels.com/@joey",
      source_url: "https://www.pexels.com/photo/brown-rock-formation-2014422/",
      thumbnail_url:
        "https://images.pexels.com/photos/2014422/pexels-photo-2014422.jpeg?auto=compress&cs=tinysrgb&h=350",
      license: "Pexels License",
      license_url: "https://www.pexels.com/license/",
      attribution_required: false,
      attribution_text: "Photo by Joey Farina on Pexels",
    });
    expect(results[1]?.title).toBe("Pexels photo 3");
  });

  it("maps videos with a video- id prefix so photo and video ids cannot collide", async () => {
    const http = new FixtureHttp({
      [`${BASE}/videos/search?query=ocean&per_page=1`]: "pexels/videos.json",
    });
    const [video] = await new PexelsProvider(http, "k").search({
      kind: "video",
      q: "ocean",
      limit: 1,
    });
    expect(video).toMatchObject({
      id: "video-3571264",
      kind: "video",
      author: "Ruvim Miksanskiy",
      attribution_text: "Video by Ruvim Miksanskiy on Pexels",
    });
  });

  it("fails with setup instructions when there is no API key, without calling the network", async () => {
    const http = new FixtureHttp({});
    await expect(
      new PexelsProvider(http, undefined).search({ kind: "photo", q: "x", limit: 1 }),
    ).rejects.toThrow(/needs an API key/);
    expect(http.requests).toEqual([]);
  });

  it("resolves a photo to the large2x rendition", async () => {
    const http = new FixtureHttp({ [`${BASE}/v1/photos/2014422`]: "pexels/photo.json" });
    const resolved = await new PexelsProvider(http, "k").resolve("2014422");
    expect(resolved.files).toEqual([
      { url: expect.stringContaining("dpr=2") as string, name: "pexels-2014422.jpg" },
    ]);
  });

  it("resolves a video to the 1080p mp4 rather than 4K or HLS", async () => {
    const http = new FixtureHttp({ [`${BASE}/videos/videos/3571264`]: "pexels/videos.json" });
    // The detail endpoint returns one video object; reuse the first entry of the list fixture.
    const provider = new PexelsProvider(
      {
        getJson: async (url, headers) =>
          ((await http.getJson(url, headers)) as { videos: unknown[] }).videos[0],
      },
      "k",
    );
    const resolved = await provider.resolve("video-3571264");
    expect(resolved.files).toEqual([
      {
        url: "https://videos.pexels.com/video-files/3571264/hd.mp4",
        name: "pexels-video-3571264.mp4",
      },
    ]);
  });

  it("falls back to the smallest larger file when nothing fits 1080p", () => {
    const files = [
      { link: "uhd", file_type: "video/mp4", width: 3840 },
      { link: "qhd", file_type: "video/mp4", width: 2560 },
    ];
    expect(pickVideoFile(files)?.link).toBe("qhd");
    expect(pickVideoFile([])).toBeUndefined();
  });
});
