import { z } from "zod";
import { MotionForgeError } from "../../core/errors.js";
import type {
  AssetCandidate,
  AssetKind,
  AssetProvider,
  DownloadFile,
  HttpClient,
  ResolvedAsset,
  SearchQuery,
} from "../types.js";

const BASE = "https://api.polyhaven.com";
const CC0_URL = "https://creativecommons.org/publicdomain/zero/1.0/";
const PREFERRED_SIZES = ["2k", "1k", "4k", "8k"];

type PolyKind = Extract<AssetKind, "texture" | "hdri" | "model">;

const API_TYPE: Readonly<Record<PolyKind, string>> = {
  texture: "textures",
  hdri: "hdris",
  model: "models",
};
const KIND_BY_TYPE: Readonly<Record<number, PolyKind>> = { 0: "hdri", 1: "texture", 2: "model" };

const Info = z.object({
  name: z.string(),
  type: z.number().optional(),
  authors: z.record(z.string(), z.string()).optional(),
  tags: z.array(z.string()).optional(),
  categories: z.array(z.string()).optional(),
});
type Info = z.infer<typeof Info>;

const FileRef = z.object({
  url: z.string(),
  include: z.record(z.string(), z.object({ url: z.string() })).optional(),
});
const Files = z.record(z.string(), z.unknown());

function toCandidate(id: string, info: Info, kind: PolyKind): AssetCandidate {
  const author = Object.keys(info.authors ?? {}).join(", ") || "Poly Haven contributors";
  return {
    provider: "polyhaven",
    id,
    kind,
    title: info.name,
    author,
    author_url: "https://polyhaven.com/about",
    source_url: `https://polyhaven.com/a/${id}`,
    thumbnail_url: `https://cdn.polyhaven.com/asset_img/thumbs/${id}.png?width=256&height=256`,
    license: "CC0 1.0",
    license_url: CC0_URL,
    attribution_required: false,
    attribution_text: `"${info.name}" by ${author} (Poly Haven, CC0)`,
  };
}

function matches(id: string, info: Info, words: readonly string[]): boolean {
  const haystack = [id, info.name, ...(info.tags ?? []), ...(info.categories ?? [])]
    .join(" ")
    .toLowerCase();
  return words.every((w) => haystack.includes(w));
}

function pickSize<T>(bySize: Record<string, T> | undefined): T | undefined {
  if (!bySize) return undefined;
  for (const size of PREFERRED_SIZES) if (bySize[size] !== undefined) return bySize[size];
  return Object.values(bySize)[0];
}

function fileEntry(
  files: Record<string, unknown>,
  key: string,
  format: string,
): z.infer<typeof FileRef> | undefined {
  const bySize = files[key] as Record<string, Record<string, unknown>> | undefined;
  const chosen = pickSize(bySize)?.[format];
  const parsed = FileRef.safeParse(chosen);
  return parsed.success ? parsed.data : undefined;
}

function downloadsFor(kind: PolyKind, id: string, files: Record<string, unknown>): DownloadFile[] {
  if (kind === "texture") {
    const diffuse = fileEntry(files, "Diffuse", "jpg") ?? fileEntry(files, "Diffuse", "png");
    return diffuse
      ? [{ url: diffuse.url, name: `polyhaven-${id}.${diffuse.url.split(".").pop() ?? "jpg"}` }]
      : [];
  }
  if (kind === "hdri") {
    const hdr = fileEntry(files, "hdri", "hdr");
    return hdr ? [{ url: hdr.url, name: `polyhaven-${id}.hdr` }] : [];
  }
  const gltf = fileEntry(files, "gltf", "gltf");
  if (!gltf) return [];
  const extras = Object.entries(gltf.include ?? {}).map(([name, ref]) => ({ url: ref.url, name }));
  return [{ url: gltf.url, name: `${id}.gltf` }, ...extras];
}

/** Poly Haven: CC0 textures, HDRIs and 3D models. No key. */
export class PolyHavenProvider implements AssetProvider {
  readonly name = "polyhaven";
  readonly kinds: readonly AssetKind[] = ["texture", "hdri", "model"];

  constructor(private readonly http: HttpClient) {}

  async search(query: SearchQuery): Promise<AssetCandidate[]> {
    if (!(query.kind in API_TYPE)) {
      throw new MotionForgeError(
        `Poly Haven does not provide "${query.kind}" assets.`,
        `Use one of: ${this.kinds.join(", ")}.`,
      );
    }
    const kind = query.kind as PolyKind;
    const raw = await this.http.getJson(`${BASE}/assets?t=${API_TYPE[kind]}`);
    const listing = z.record(z.string(), Info).parse(raw);
    const words = query.q.toLowerCase().split(/\s+/).filter(Boolean);
    return Object.entries(listing)
      .filter(([id, info]) => matches(id, info, words))
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(0, query.limit)
      .map(([id, info]) => toCandidate(id, info, kind));
  }

  async resolve(id: string): Promise<ResolvedAsset> {
    const safeId = encodeURIComponent(id);
    const info = Info.parse(await this.http.getJson(`${BASE}/info/${safeId}`));
    const kind = KIND_BY_TYPE[info.type ?? -1];
    if (!kind) throw new MotionForgeError(`Poly Haven asset ${id} has an unsupported type.`);
    const files = Files.parse(await this.http.getJson(`${BASE}/files/${safeId}`));
    const downloads = downloadsFor(kind, id, files);
    if (downloads.length === 0) {
      throw new MotionForgeError(
        `Poly Haven asset ${id} has no downloadable ${kind} file.`,
        "Try another asset from `motionforge assets search`.",
      );
    }
    return { candidate: toCandidate(id, info, kind), files: downloads };
  }
}
