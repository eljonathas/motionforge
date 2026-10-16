import path from "node:path";
import { z } from "zod";
import { ReelcraftError } from "../../core/errors.js";
import type {
  AssetCandidate,
  AssetKind,
  AssetProvider,
  HttpClient,
  ResolvedAsset,
  SearchQuery,
} from "../types.js";

const BASE = "https://api.openverse.org/v1";

const Item = z.object({
  id: z.string(),
  title: z.string().nullish(),
  creator: z.string().nullish(),
  creator_url: z.string().nullish(),
  url: z.string().nullish(),
  thumbnail: z.string().nullish(),
  foreign_landing_url: z.string().nullish(),
  license: z.string(),
  license_version: z.string().nullish(),
  license_url: z.string().nullish(),
  attribution: z.string().nullish(),
  filetype: z.string().nullish(),
});
type Item = z.infer<typeof Item>;

const Results = z.object({ results: z.array(Item) });

type Endpoint = "images" | "audio";

interface KindMapping {
  endpoint: Endpoint;
  category?: string;
  suffix?: string;
}

const KIND_MAP: Readonly<Partial<Record<AssetKind, KindMapping>>> = {
  photo: { endpoint: "images", category: "photograph" },
  illustration: { endpoint: "images", category: "illustration" },
  texture: { endpoint: "images", suffix: " texture" },
  sfx: { endpoint: "audio", category: "sound_effect" },
};

const NO_ATTRIBUTION = new Set(["cc0", "pdm"]);

function licenseName(item: Item): string {
  const code = item.license.toLowerCase();
  if (code === "cc0") return "CC0 1.0";
  if (code === "pdm") return "Public Domain Mark 1.0";
  return `CC ${code.toUpperCase()}${item.license_version ? ` ${item.license_version}` : ""}`;
}

function toCandidate(item: Item, kind: AssetKind): AssetCandidate {
  const title = item.title?.trim() || item.id;
  const author = item.creator ?? "";
  const attributionRequired = !NO_ATTRIBUTION.has(item.license.toLowerCase());
  return {
    provider: "openverse",
    id: item.id,
    kind,
    title,
    author,
    author_url: item.creator_url ?? "",
    source_url: item.foreign_landing_url ?? "",
    thumbnail_url: item.thumbnail ?? "",
    license: licenseName(item),
    license_url: item.license_url ?? "",
    attribution_required: attributionRequired,
    attribution_text:
      item.attribution ?? `"${title}"${author ? ` by ${author}` : ""} (${licenseName(item)})`,
  };
}

function extensionOf(item: Item): string {
  const fromType = item.filetype?.toLowerCase().replace(/^\./, "");
  if (fromType && /^[a-z0-9]{2,5}$/.test(fromType)) return fromType === "jpeg" ? "jpg" : fromType;
  const fromUrl = path.posix.extname(new URL(item.url ?? "https://x.invalid/a").pathname).slice(1);
  return fromUrl || "bin";
}

/** Openverse: Creative Commons images and audio. Anonymous use, no key. */
export class OpenverseProvider implements AssetProvider {
  readonly name = "openverse";
  readonly kinds: readonly AssetKind[] = ["photo", "illustration", "texture", "sfx"];

  constructor(private readonly http: HttpClient) {}

  async search(query: SearchQuery): Promise<AssetCandidate[]> {
    const mapping = KIND_MAP[query.kind];
    if (!mapping) {
      throw new ReelcraftError(
        `Openverse does not provide "${query.kind}" assets.`,
        `Use one of: ${this.kinds.join(", ")}.`,
      );
    }
    const params = new URLSearchParams({
      q: `${query.q}${mapping.suffix ?? ""}`,
      page_size: String(query.limit),
    });
    if (mapping.category) params.set("category", mapping.category);
    if (!query.anyLicense) params.set("license_type", "commercial,modification");
    const raw = await this.http.getJson(`${BASE}/${mapping.endpoint}/?${params.toString()}`);
    return Results.parse(raw).results.map((item) => toCandidate(item, query.kind));
  }

  async resolve(id: string): Promise<ResolvedAsset> {
    const found = await this.findById(id);
    const { item, kind } = found;
    if (!item.url) throw new ReelcraftError(`Openverse item ${id} has no downloadable file.`);
    return {
      candidate: toCandidate(item, kind),
      files: [{ url: item.url, name: `openverse-${item.id}.${extensionOf(item)}` }],
    };
  }

  private async findById(id: string): Promise<{ item: Item; kind: AssetKind }> {
    const safeId = encodeURIComponent(id);
    try {
      return {
        item: Item.parse(await this.http.getJson(`${BASE}/images/${safeId}/`)),
        kind: "photo",
      };
    } catch (error) {
      if (!(error instanceof ReelcraftError) || !error.message.includes("HTTP 404")) throw error;
    }
    try {
      return { item: Item.parse(await this.http.getJson(`${BASE}/audio/${safeId}/`)), kind: "sfx" };
    } catch (error) {
      if (error instanceof ReelcraftError && error.message.includes("HTTP 404")) {
        throw new ReelcraftError(
          `Openverse has no image or audio with id ${id}.`,
          "Use an id from `reelcraft assets search`.",
        );
      }
      throw error;
    }
  }
}
