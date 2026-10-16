import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
interface Manifest {
  name: string;
  version: string;
  skills: string[];
  mcpServers: Record<string, unknown>;
  bin: Record<string, string>;
  owner: { name: string };
  plugins: { name: string; source: string }[];
}

const json = (rel: string) => JSON.parse(readFileSync(path.join(root, rel), "utf8")) as Manifest;

describe("Claude Code plugin packaging", () => {
  const pkg = json("package.json");
  const plugin = json(".claude-plugin/plugin.json");
  const marketplace = json(".claude-plugin/marketplace.json");

  it("keeps the plugin version in step with the npm package", () => {
    expect(plugin.version).toBe(pkg.version);
    expect(pkg.name).toBe(`@eljonathas/${plugin.name}`);
  });

  it("declares the skills folder and starts the MCP server from the scoped package", () => {
    // The bare npm name "motionforge" belongs to another project; npx must never resolve to it.
    expect(plugin.skills).toEqual(["./skills/"]);
    expect(plugin.mcpServers["motionforge"]).toEqual({
      command: "npx",
      args: ["-y", pkg.name, "mcp"],
    });
    expect(pkg.bin["motionforge"]).toBe("dist/cli.js");
  });

  it("lists the plugin at the repository root so `marketplace add eljonathas/motionforge` works", () => {
    expect(marketplace.plugins).toEqual([
      expect.objectContaining({ name: plugin.name, source: "./" }),
    ]);
    expect(marketplace.owner.name).toBeTruthy();
  });
});
