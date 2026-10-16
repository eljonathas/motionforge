import { FetchFileDownloader, FetchHttpClient } from "./assets/http.js";
import { createDefaultRegistry, type ProviderRegistry } from "./assets/registry.js";
import type { FileDownloader } from "./assets/types.js";

/** Everything with side effects that commands need, injectable for tests. */
export interface Context {
  cwd: string;
  homeDir: string | undefined;
  now: () => Date;
  registry: ProviderRegistry;
  downloader: FileDownloader;
}

export function createContext(overrides: Partial<Context> = {}): Context {
  return {
    cwd: process.cwd(),
    homeDir: undefined,
    now: () => new Date(),
    registry: createDefaultRegistry(new FetchHttpClient()),
    downloader: new FetchFileDownloader(),
    ...overrides,
  };
}
