import { createWriteStream } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { MotionForgeError } from "../core/errors.js";
import type { FileDownloader, HttpClient } from "./types.js";

const JSON_TIMEOUT_MS = 20_000;
const DOWNLOAD_TIMEOUT_MS = 180_000;
const USER_AGENT = "motionforge (+https://github.com/eljonathas/motionforge)";

function describeHttpFailure(url: string, status: number): MotionForgeError {
  const host = new URL(url).host;
  if (status === 401 || status === 403) {
    return new MotionForgeError(
      `${host} rejected the request (HTTP ${status}).`,
      "Check the API key in the environment variable for this provider.",
    );
  }
  if (status === 429) {
    return new MotionForgeError(
      `${host} is rate limiting requests (HTTP 429).`,
      "Wait a minute and try again, or lower --limit.",
    );
  }
  return new MotionForgeError(`${host} answered HTTP ${status} for ${url}.`);
}

async function guardedFetch(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  try {
    return await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  } catch (error) {
    const timedOut = (error as Error).name === "TimeoutError";
    throw new MotionForgeError(
      timedOut
        ? `Timed out after ${timeoutMs / 1000}s calling ${new URL(url).host}.`
        : `Could not reach ${new URL(url).host}: ${(error as Error).message}`,
      "Check the network connection and try again.",
    );
  }
}

export class FetchHttpClient implements HttpClient {
  constructor(private readonly timeoutMs = JSON_TIMEOUT_MS) {}

  async getJson(url: string, headers: Readonly<Record<string, string>> = {}): Promise<unknown> {
    const response = await guardedFetch(
      url,
      { headers: { "user-agent": USER_AGENT, accept: "application/json", ...headers } },
      this.timeoutMs,
    );
    if (!response.ok) throw describeHttpFailure(url, response.status);
    return response.json();
  }
}

export class FetchFileDownloader implements FileDownloader {
  constructor(private readonly timeoutMs = DOWNLOAD_TIMEOUT_MS) {}

  async download(url: string, destination: string): Promise<void> {
    const response = await guardedFetch(
      url,
      { headers: { "user-agent": USER_AGENT } },
      this.timeoutMs,
    );
    if (!response.ok || !response.body) throw describeHttpFailure(url, response.status);
    await mkdir(path.dirname(destination), { recursive: true });
    try {
      await pipeline(Readable.fromWeb(response.body), createWriteStream(destination));
    } catch (error) {
      await rm(destination, { force: true });
      throw new MotionForgeError(`Download of ${url} failed: ${(error as Error).message}`);
    }
  }
}
