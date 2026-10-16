export const ASSET_KINDS = [
  "photo",
  "video",
  "texture",
  "hdri",
  "model",
  "illustration",
  "icon",
  "sfx",
] as const;
export type AssetKind = (typeof ASSET_KINDS)[number];

export interface SearchQuery {
  kind: AssetKind;
  q: string;
  limit: number;
  /** Openverse only: also return licences that do not allow commercial use or modification. */
  anyLicense?: boolean;
}

/** Licence and origin facts shared by search results and downloads. */
export interface AssetCandidate {
  provider: string;
  id: string;
  kind: AssetKind;
  title: string;
  author: string;
  author_url: string;
  source_url: string;
  thumbnail_url: string;
  license: string;
  license_url: string;
  attribution_required: boolean;
  attribution_text: string;
}

export interface DownloadFile {
  url: string;
  /** Path inside the asset's folder (or the file name when the asset is a single file). */
  name: string;
}

export interface ResolvedAsset {
  candidate: AssetCandidate;
  files: DownloadFile[];
}

export interface AssetProvider {
  readonly name: string;
  readonly kinds: readonly AssetKind[];
  search(query: SearchQuery): Promise<AssetCandidate[]>;
  resolve(id: string): Promise<ResolvedAsset>;
}

/** Network access used by providers; tests replace it with recorded fixtures. */
export interface HttpClient {
  getJson(url: string, headers?: Readonly<Record<string, string>>): Promise<unknown>;
}

export interface FileDownloader {
  download(url: string, destination: string): Promise<void>;
}
