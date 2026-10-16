import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ReelcraftError } from "../../src/core/errors.js";
import type { FileDownloader, HttpClient } from "../../src/assets/types.js";

const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "fixtures");

export function fixture(name: string): unknown {
  return JSON.parse(readFileSync(path.join(FIXTURES, name), "utf8")) as unknown;
}

export interface RecordedRequest {
  url: string;
  headers: Readonly<Record<string, string>>;
}

/**
 * Serves recorded JSON by exact URL. The fixtures were written from the providers' public API
 * documentation, not captured from the live services.
 */
export class FixtureHttp implements HttpClient {
  readonly requests: RecordedRequest[] = [];

  constructor(private readonly routes: Readonly<Record<string, string>>) {}

  getJson(url: string, headers: Readonly<Record<string, string>> = {}): Promise<unknown> {
    this.requests.push({ url, headers });
    const file = this.routes[url];
    if (file === undefined) {
      return Promise.reject(new ReelcraftError(`api.test answered HTTP 404 for ${url}.`));
    }
    return Promise.resolve(fixture(file));
  }
}

/** Writes a small placeholder instead of hitting the network. */
export class FakeDownloader implements FileDownloader {
  readonly downloads: { url: string; destination: string }[] = [];

  async download(url: string, destination: string): Promise<void> {
    this.downloads.push({ url, destination });
    const { mkdir, writeFile } = await import("node:fs/promises");
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, `fake:${url}`);
  }
}
