import { Command } from "commander";
import { registerAssetCommands } from "./commands/assets.js";
import { registerMemoryCommands } from "./commands/memory.js";
import { registerProjectCommands } from "./commands/project.js";
import type { Context } from "./context.js";
import { ownVersion } from "./core/packages.js";
import { serveStdio } from "./mcp/server.js";

export async function buildProgram(ctx: Context): Promise<Command> {
  const program = new Command("motionforge")
    .description("Tooling around HyperFrames for agent-made motion graphics")
    .version(await ownVersion())
    .showHelpAfterError();
  registerProjectCommands(program, ctx);
  registerAssetCommands(program, ctx);
  registerMemoryCommands(program, ctx);
  program
    .command("mcp")
    .description("Run the MCP server on stdio")
    .action(async () => serveStdio(ctx));
  return program;
}
