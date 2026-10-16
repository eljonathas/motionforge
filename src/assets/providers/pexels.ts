import { z } from "zod";
import { MotionForgeError } from "../../core/errors.js";
import type {
  AssetCandidate,
  AssetKind,
  AssetProvider,
  HttpClient,
  ResolvedAsset,
  SearchQuery,
} from "../types.js";

const BASE = "https://api.pexels.com";
const LICENSE_URL = "https://www.pexels.com/license/";
const MAX_VIDEO_WIDTH = 1920;

const Photo = z.object({
  id: z.number(),
  url: z.string(),
  photographer: z.string(),
  photographer_url: z.string().optional(),
  alt: z.string().nullish(),
  src: z.object({
    large2x: z.string().optional(),
    large: z.string().optional(),
    original: z.string(),
    medium: z.string().optional(),
  }),
});
type Photo = z.infer<typeof Photo>;

const VideoFile = z.object({
  link: z.string(),
  file_type: z.string(),
  width: z.number().nullish(),
});
const Video = z.object({
  id: z.number(),
  url: z.string(),
  image: z.string().optional(),
  user: z.object({ name: z.string(), url: z.string().optional() }),
  video_files: z.array(VideoFile),
});
type Video = z.infer<typeof Video>;

interface CandidateFields {
  id: string;
  kind: AssetKind;
  author: string;
  authorUrl: string | undefined;
  sourceUrl: string;
  thumbnail: string;
  title: string;
}

function toCandidate(f: CandidateFields): AssetCandidate {
  return {
    provider: "pexels",
    id: f.id,
    kind: f.kind,
    title: f.title,
    author: f.author,
    author_url: f.authorUrl ?? "",
    source_url: f.sourceUrl,
    thumbnail_url: f.thumbnail,
    license: "Pexels License",
    license_url: LICENSE_URL,
    attribution_required: false,
    attribution_text: `${f.kind === "video" ? "Video" : "Photo"} by ${f.author} on Pexels`,
  };
}

function photoCandidate(photo: Photo): AssetCandidate {
  return toCandidate({
    id: String(photo.id),
    kind: "photo",
    author: photo.photographer,
    authorUrl: photo.photographer_url,
    sourceUrl: photo.url,
    thumbnail: photo.src.medium ?? photo.src.original,
    title: photo.alt?.trim() || `Pexels photo ${photo.id}`,
  });
}

/** Video ids carry a "video-" prefix because Pexels photo and video ids overlap. */
function videoCandidate(video: Video): AssetCandidate {
  return toCandidate({
    id: `video-${video.id}`,
    kind: "video",
    author: video.user.name,
    authorUrl: video.user.url,
    sourceUrl: video.url,
    thumbnail: video.image ?? "",
    title: `Pexels video ${video.id}`,
  });
}

/** Best mp4 for a 1080p render: the widest file up to 1920px, else the narrowest one above it. */
export function pickVideoFile(
  files: readonly z.infer<typeof VideoFile>[],
): z.infer<typeof VideoFile> | undefined {
  const mp4 = files.filter((f) => f.file_type === "video/mp4");
  const fitting = mp4
    .filter((f) => (f.width ?? 0) <= MAX_VIDEO_WIDTH)
    .sort((a, b) => (b.width ?? 0) - (a.width ?? 0));
  const larger = mp4
    .filter((f) => (f.width ?? 0) > MAX_VIDEO_WIDTH)
    .sort((a, b) => (a.width ?? 0) - (b.width ?? 0));
  return fitting[0] ?? larger[0];
}

/** Pexels: free photos and videos. Needs a free API key in PEXELS_API_KEY. */
export class PexelsProvider implements AssetProvider {
  readonly name = "pexels";
  readonly kinds: readonly AssetKind[] = ["photo", "video"];

  constructor(
    private readonly http: HttpClient,
    private readonly apiKey: string | undefined,
  ) {}

  async search(query: SearchQuery): Promise<AssetCandidate[]> {
    const headers = this.authHeaders();
    const params = new URLSearchParams({ query: query.q, per_page: String(query.limit) });
    if (query.kind === "photo") {
      const raw = await this.http.getJson(`${BASE}/v1/search?${params.toString()}`, headers);
      return z
        .object({ photos: z.array(Photo) })
        .parse(raw)
        .photos.map(photoCandidate);
    }
    if (query.kind === "video") {
      const raw = await this.http.getJson(`${BASE}/videos/search?${params.toString()}`, headers);
      return z
        .object({ videos: z.array(Video) })
        .parse(raw)
        .videos.map(videoCandidate);
    }
    throw new MotionForgeError(
      `Pexels does not provide "${query.kind}" assets.`,
      `Use one of: ${this.kinds.join(", ")}.`,
    );
  }

  async resolve(id: string): Promise<ResolvedAsset> {
    const headers = this.authHeaders();
    const safeId = encodeURIComponent(id);
    const kind = id.startsWith("video-") ? "video" : "photo";
    if (kind === "video") {
      const raw = await this.http.getJson(
        `${BASE}/videos/videos/${encodeURIComponent(id.slice(6))}`,
        headers,
      );
      return this.videoAsset(Video.parse(raw));
    }
    const photo = Photo.parse(await this.http.getJson(`${BASE}/v1/photos/${safeId}`, headers));
    const url = photo.src.large2x ?? photo.src.large ?? photo.src.original;
    return { candidate: photoCandidate(photo), files: [{ url, name: `pexels-${photo.id}.jpg` }] };
  }

  private videoAsset(video: Video): ResolvedAsset {
    const file = pickVideoFile(video.video_files);
    if (!file) throw new MotionForgeError(`Pexels video ${video.id} has no mp4 file.`);
    return {
      candidate: videoCandidate(video),
      files: [{ url: file.link, name: `pexels-video-${video.id}.mp4` }],
    };
  }

  private authHeaders(): Record<string, string> {
    if (!this.apiKey) {
      throw new MotionForgeError(
        "Pexels needs an API key.",
        "Create a free key at https://www.pexels.com/api/ and set PEXELS_API_KEY.",
      );
    }
    return { authorization: this.apiKey };
  }
}
