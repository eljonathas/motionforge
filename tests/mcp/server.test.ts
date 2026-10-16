import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { beforeAll, describe, expect, it } from "vitest";
import { OpenverseProvider } from "../../src/assets/providers/openverse.js";
import { PexelsProvider } from "../../src/assets/providers/pexels.js";
import { ProviderRegistry } from "../../src/assets/registry.js";
import { createContext } from "../../src/context.js";
import { buildServer } from "../../src/mcp/server.js";
import { FakeDownloader, FixtureHttp } from "../helpers/fixture-http.js";
import { makeProject, makeTempDir } from "../helpers/tmp.js";

beforeAll(() => {
  process.env["HYPERFRAMES_SKIP_SKILLS"] = "1";
});

const http = new FixtureHttp({
  "https://api.openverse.org/v1/images/?q=forest&page_size=10&category=photograph&license_type=commercial%2Cmodification":
    "openverse/images.json",
  "https://api.pexels.com/v1/photos/2014422": "pexels/photo.json",
});

async function connect(cwd: string) {
  const homeDir = await makeTempDir();
  const ctx = createContext({
    cwd,
    homeDir,
    registry: new ProviderRegistry([new OpenverseProvider(http), new PexelsProvider(http, "k")]),
    downloader: new FakeDownloader(),
    now: () => new Date("2026-10-16T10:00:00.000Z"),
  });
  const server = await buildServer(ctx);
  const client = new Client({ name: "test", version: "0.0.0" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(a), client.connect(b)]);
  return client;
}

async function call(client: Client, name: string, args: Record<string, unknown>) {
  const result = (await client.callTool({ name, arguments: args })) as {
    isError?: boolean;
    content: { type: string; text: string }[];
  };
  return { isError: result.isError === true, text: result.content[0]?.text ?? "" };
}

describe("reelcraft MCP server", () => {
  it("exposes the nine tools with descriptions and JSON schemas", async () => {
    const client = await connect(await makeTempDir());
    const { tools } = await client.listTools();

    expect(tools.map((t) => t.name).sort()).toEqual([
      "assets_get",
      "assets_search",
      "check",
      "memory_add",
      "memory_search",
      "project_new",
      "render",
      "snapshot",
      "vendor",
    ]);
    expect(tools.every((t) => t.description && t.inputSchema.type === "object")).toBe(true);
    expect(tools.find((t) => t.name === "assets_search")?.inputSchema.required).toEqual([
      "kind",
      "q",
    ]);
  });

  it("creates a project, then checks and vendors it", async () => {
    const cwd = await makeTempDir();
    const client = await connect(cwd);

    const created = await call(client, "project_new", { name: "clip", resolution: "square" });
    expect(created.isError).toBe(false);
    expect(JSON.parse(created.text)).toMatchObject({ resolution: "square" });

    const checked = JSON.parse((await call(client, "check", { dir: "clip" })).text) as {
      errors: number;
      filesChecked: number;
    };
    expect(checked).toMatchObject({ errors: 0, filesChecked: 1 });

    const vendored = JSON.parse((await call(client, "vendor", { dir: "clip" })).text) as {
      replacedCount: number;
    };
    expect(vendored.replacedCount).toBe(0);
  });

  it("searches and downloads assets, recording the licence", async () => {
    const dir = await makeProject({ "assets/LICENCAS.json": "[]" });
    const client = await connect(dir);

    const search = JSON.parse(
      (await call(client, "assets_search", { kind: "photo", q: "forest", provider: "openverse" }))
        .text,
    ) as { results: unknown[] };
    expect(search.results).toHaveLength(2);

    const got = await call(client, "assets_get", { ref: "pexels:2014422" });
    expect(got.isError).toBe(false);
    expect(got.text).toContain("assets/photo/pexels-2014422.jpg");
    const check = JSON.parse((await call(client, "check", {})).text) as {
      findings: { rule: string }[];
    };
    expect(check.findings.filter((f) => f.rule.startsWith("license"))).toEqual([]);
  });

  it("adds and searches memory", async () => {
    const dir = await makeTempDir();
    const client = await connect(dir);

    await call(client, "memory_add", {
      kind: "rejected",
      decision: "Flat circles on a plain background",
      tags: ["primitives"],
    });
    const found = JSON.parse((await call(client, "memory_search", { text: "circles" })).text) as {
      lesson: { kind: string };
    }[];

    expect(found.map((f) => f.lesson.kind)).toEqual(["rejected"]);
  });

  it("returns actionable tool errors instead of protocol errors", async () => {
    const client = await connect(await makeTempDir());

    const missingDir = await call(client, "check", { dir: "nope" });
    expect(missingDir).toMatchObject({ isError: true });
    expect(missingDir.text).toMatch(/Project directory not found/);

    const badRef = await call(client, "assets_get", { ref: "pexels" });
    expect(badRef.isError).toBe(true);
    expect(badRef.text).toMatch(/<provider>:<id>/);

    const badInput = await client.callTool({
      name: "assets_search",
      arguments: { kind: "gif", q: "x" },
    });
    expect(badInput.isError).toBe(true);
  });

  it("refuses to render a project that fails the licence or offline checks", async () => {
    const dir = await makeProject({ "index.html": '<img src="https://x.test/a.jpg">' });
    const client = await connect(dir);

    const render = await call(client, "render", {});

    expect(render.isError).toBe(true);
    expect(render.text).toMatch(/Refusing to render/);
    expect(render.text).toMatch(/force: true/);
  });
});
