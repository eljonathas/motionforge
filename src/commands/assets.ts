import path from "node:path";
import type { Command } from "commander";
import { formatCandidates, formatDownload } from "../assets/format.js";
import { getAsset } from "../assets/get.js";
import { parseKind, searchAssets } from "../assets/registry.js";
import { ASSET_KINDS } from "../assets/types.js";
import type { Context } from "../context.js";
import { print, printError } from "./output.js";

export function registerAssetCommands(program: Command, ctx: Context): void {
  const assets = program.command("assets").description("Search and download licensed assets");

  assets
    .command("search")
    .description("Search providers for assets with a usable licence")
    .requiredOption("--kind <kind>", `one of: ${ASSET_KINDS.join(", ")}`)
    .requiredOption("--q <text>", "search text")
    .option("--provider <name>", "only this provider (openverse, polyhaven, pexels)")
    .option("--limit <n>", "results per provider", "10")
    .option("--any-license", "Openverse: include NC/ND licences (not recommended)")
    .option("--json", "print JSON")
    .action(
      async (opts: {
        kind: string;
        q: string;
        provider?: string;
        limit: string;
        anyLicense?: boolean;
        json?: boolean;
      }) => {
        const { results, problems } = await searchAssets(ctx.registry, {
          kind: parseKind(opts.kind),
          q: opts.q,
          provider: opts.provider,
          limit: Number(opts.limit),
          anyLicense: opts.anyLicense ?? false,
        });
        print(
          opts.json ? JSON.stringify({ results, problems }, null, 2) : formatCandidates(results),
        );
        for (const problem of problems) printError(`warning: ${problem}`);
      },
    );

  assets
    .command("get <ref>")
    .description("Download <provider>:<id> into assets/<kind>/ and record its licence")
    .option("--dir <dir>", "project directory", ".")
    .action(async (ref: string, opts: { dir: string }) => {
      const result = await getAsset(path.resolve(ctx.cwd, opts.dir), ref, ctx);
      print(formatDownload(result));
    });
}
