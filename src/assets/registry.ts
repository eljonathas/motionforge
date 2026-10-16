import { ReelcraftError } from "../core/errors.js";
import { OpenverseProvider } from "./providers/openverse.js";
import { PexelsProvider } from "./providers/pexels.js";
import { PolyHavenProvider } from "./providers/polyhaven.js";
import {
  ASSET_KINDS,
  type AssetCandidate,
  type AssetKind,
  type AssetProvider,
  type HttpClient,
  type SearchQuery,
} from "./types.js";

export class ProviderRegistry {
  private readonly byName: ReadonlyMap<string, AssetProvider>;

  constructor(providers: readonly AssetProvider[]) {
    this.byName = new Map(providers.map((p) => [p.name, p]));
  }

  names(): string[] {
    return [...this.byName.keys()];
  }

  get(name: string): AssetProvider {
    const provider = this.byName.get(name);
    if (!provider) {
      throw new ReelcraftError(
        `Unknown asset provider "${name}".`,
        `Available providers: ${this.names().join(", ")}.`,
      );
    }
    return provider;
  }

  /** Providers that serve this kind, optionally narrowed to one by name. */
  forKind(kind: AssetKind, only?: string): AssetProvider[] {
    if (only) {
      const provider = this.get(only);
      if (!provider.kinds.includes(kind)) {
        throw new ReelcraftError(
          `${only} does not provide "${kind}" assets.`,
          `${only} provides: ${provider.kinds.join(", ")}.`,
        );
      }
      return [provider];
    }
    const providers = [...this.byName.values()].filter((p) => p.kinds.includes(kind));
    if (providers.length === 0) {
      throw new ReelcraftError(
        `No provider is available for "${kind}" assets yet.`,
        "Try photo, video, texture, hdri, model, illustration or sfx.",
      );
    }
    return providers;
  }
}

export function createDefaultRegistry(
  http: HttpClient,
  env: NodeJS.ProcessEnv = process.env,
): ProviderRegistry {
  const pexelsKey = env["PEXELS_API_KEY"]?.trim();
  return new ProviderRegistry([
    new OpenverseProvider(http),
    new PolyHavenProvider(http),
    new PexelsProvider(http, pexelsKey === "" ? undefined : pexelsKey),
  ]);
}

export function parseKind(value: string): AssetKind {
  if ((ASSET_KINDS as readonly string[]).includes(value)) return value as AssetKind;
  throw new ReelcraftError(
    `Unknown asset kind "${value}".`,
    `Use one of: ${ASSET_KINDS.join(", ")}.`,
  );
}

export interface SearchOptions extends Omit<SearchQuery, "limit"> {
  provider?: string | undefined;
  limit?: number | undefined;
}

/**
 * Searches every provider that serves the kind. A provider that fails (missing key, outage) does not
 * hide results from the others unless the caller named that provider explicitly.
 */
export async function searchAssets(
  registry: ProviderRegistry,
  options: SearchOptions,
): Promise<{ results: AssetCandidate[]; problems: string[] }> {
  const providers = registry.forKind(options.kind, options.provider);
  const query: SearchQuery = { ...options, limit: options.limit ?? 10 };
  const settled = await Promise.allSettled(providers.map((p) => p.search(query)));
  const results: AssetCandidate[] = [];
  const problems: string[] = [];
  settled.forEach((outcome, i) => {
    const name = providers[i]?.name ?? "provider";
    if (outcome.status === "fulfilled") results.push(...outcome.value);
    else if (options.provider) throw outcome.reason;
    else
      problems.push(
        `${name}: ${outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason)}`,
      );
  });
  return { results, problems };
}
