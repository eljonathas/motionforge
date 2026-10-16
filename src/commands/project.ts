import type { Command } from "commander";
import type { Context } from "../context.js";
import { checkProject, formatCheckReport } from "../check/run.js";
import { createProject } from "../project/scaffold.js";
import { RESOLUTIONS } from "../project/resolution.js";
import { formatVendorReport, vendorProject } from "../vendor/vendor.js";
import { print } from "./output.js";
import path from "node:path";

export function registerProjectCommands(program: Command, ctx: Context): void {
  program
    .command("new <name>")
    .description("Create a HyperFrames project that renders offline")
    .option("--resolution <preset>", `canvas preset: ${RESOLUTIONS.join(", ")}`, "landscape")
    .action(async (name: string, opts: { resolution: string }) => {
      const result = await createProject({ name, resolution: opts.resolution, cwd: ctx.cwd });
      print(`Created ${result.projectDir} (${result.resolution}).`);
      print(`Vendored locally: ${result.vendor.copied.join(", ") || "nothing"}.`);
      print(
        `Next: cd ${name}, write brief.md, then \`reelcraft check\` and \`npx hyperframes preview\`.`,
      );
    });

  program
    .command("vendor [dir]")
    .description("Replace CDN references with local copies in vendor/")
    .action(async (dir: string | undefined) => {
      const report = await vendorProject(path.resolve(ctx.cwd, dir ?? "."));
      print(formatVendorReport(report));
      if (report.skippedCount > 0) process.exitCode = 1;
    });

  program
    .command("check [dir]")
    .description("Static checks: licences, remote URLs, primitive aesthetic")
    .option("--json", "print the report as JSON")
    .option(
      "--max-primitive-ratio <ratio>",
      "share of decorative shapes that flags a scene",
      parseRatio,
    )
    .action(
      async (dir: string | undefined, opts: { json?: boolean; maxPrimitiveRatio?: number }) => {
        const report = await checkProject(
          path.resolve(ctx.cwd, dir ?? "."),
          opts.maxPrimitiveRatio === undefined ? {} : { maxPrimitiveRatio: opts.maxPrimitiveRatio },
        );
        print(opts.json ? JSON.stringify(report, null, 2) : formatCheckReport(report));
        if (report.errors > 0) process.exitCode = 1;
      },
    );
}

function parseRatio(value: string): number {
  const ratio = Number(value);
  if (!Number.isFinite(ratio) || ratio < 0 || ratio > 1) {
    throw new Error("--max-primitive-ratio must be a number between 0 and 1");
  }
  return ratio;
}
