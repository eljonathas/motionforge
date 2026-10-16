export type CdnHost = "jsdelivr" | "unpkg" | "cdnjs" | "google-fonts";

export interface CdnRef {
  /** The URL exactly as written in the source (may be protocol-relative). */
  url: string;
  host: CdnHost;
  /** npm package name when it can be told from the URL. */
  pkg: string | undefined;
  version: string | undefined;
  /** Path inside the package (no leading slash), "" when the URL points at the package root. */
  filePath: string;
}

export const CDN_URL_PATTERN =
  /(?:https?:)?\/\/(?:cdn\.jsdelivr\.net|unpkg\.com|cdnjs\.cloudflare\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)\/[^\s"'<>()\\]+/g;

const CDNJS_PACKAGES: Readonly<Record<string, string>> = {
  gsap: "gsap",
  "lottie-web": "lottie-web",
  "three.js": "three",
  animejs: "animejs",
};

/** Splits `name@1.2.3/dist/x.js` (or `@scope/name@1.2.3/x.js`) into its parts. */
function splitPackageSpec(spec: string): Pick<CdnRef, "pkg" | "version" | "filePath"> {
  const parts = spec.split("/");
  const nameParts = parts[0]?.startsWith("@") ? parts.splice(0, 2) : parts.splice(0, 1);
  const joined = nameParts.join("/");
  const at = joined.lastIndexOf("@");
  const hasVersion = at > 0;
  return {
    pkg: hasVersion ? joined.slice(0, at) : joined,
    version: hasVersion ? joined.slice(at + 1) : undefined,
    filePath: parts.join("/"),
  };
}

function clean(pathname: string): string {
  return pathname.split(/[?#]/)[0] ?? "";
}

export function parseCdnUrl(rawUrl: string): CdnRef | undefined {
  let url: URL;
  try {
    url = new URL(rawUrl.startsWith("//") ? `https:${rawUrl}` : rawUrl);
  } catch {
    return undefined;
  }
  const pathname = clean(url.pathname).replace(/^\//, "");
  const base = { url: rawUrl };
  if (url.hostname.startsWith("fonts.g")) {
    return {
      ...base,
      host: "google-fonts",
      pkg: undefined,
      version: undefined,
      filePath: pathname,
    };
  }
  if (url.hostname === "cdn.jsdelivr.net") {
    if (!pathname.startsWith("npm/")) {
      return { ...base, host: "jsdelivr", pkg: undefined, version: undefined, filePath: pathname };
    }
    return { ...base, host: "jsdelivr", ...splitPackageSpec(pathname.slice(4)) };
  }
  if (url.hostname === "unpkg.com")
    return { ...base, host: "unpkg", ...splitPackageSpec(pathname) };
  const [, , name = "", version, ...rest] = pathname.split("/");
  return {
    ...base,
    host: "cdnjs",
    pkg: CDNJS_PACKAGES[name],
    version,
    filePath: rest.join("/"),
  };
}
