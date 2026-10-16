import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { describeError } from "../core/errors.js";
import { ownVersion } from "../core/packages.js";
import type { Context } from "../context.js";
import { TOOLS } from "./tools.js";

type ToolResult = { content: { type: "text"; text: string }[]; isError?: boolean };

function asText(value: unknown): string {
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
}

/** Runs one tool; failures become MCP tool errors with the actionable message, never protocol errors. */
export async function callTool(
  name: string,
  input: Record<string, unknown>,
  ctx: Context,
): Promise<ToolResult> {
  const tool = TOOLS.find((t) => t.name === name);
  if (!tool) return { isError: true, content: [{ type: "text", text: `Unknown tool ${name}.` }] };
  try {
    return { content: [{ type: "text", text: asText(await tool.run(input, ctx)) }] };
  } catch (error) {
    return { isError: true, content: [{ type: "text", text: describeError(error) }] };
  }
}

export async function buildServer(ctx: Context): Promise<McpServer> {
  const server = new McpServer({ name: "reelcraft", version: await ownVersion() });
  for (const tool of TOOLS) {
    server.registerTool(
      tool.name,
      { description: tool.description, inputSchema: tool.inputSchema },
      (input: Record<string, unknown>) => callTool(tool.name, input, ctx),
    );
  }
  return server;
}

export async function serveStdio(ctx: Context): Promise<void> {
  const server = await buildServer(ctx);
  await server.connect(new StdioServerTransport());
}
