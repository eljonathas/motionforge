import { readFile } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { FetchFileDownloader, FetchHttpClient } from "../../src/assets/http.js";
import { makeTempDir } from "../helpers/tmp.js";

let server: Server | undefined;

afterEach(() => {
  server?.closeAllConnections();
  server?.close();
  server = undefined;
});

async function serve(handler: Parameters<typeof createServer>[1]): Promise<string> {
  server = createServer(handler);
  await new Promise<void>((resolve) => server?.listen(0, "127.0.0.1", resolve));
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

describe("FetchHttpClient", () => {
  it("returns parsed JSON and forwards headers", async () => {
    let seen = "";
    const base = await serve((req, res) => {
      seen = String(req.headers["authorization"]);
      res.setHeader("content-type", "application/json").end('{"ok":true}');
    });
    expect(await new FetchHttpClient().getJson(`${base}/x`, { authorization: "key" })).toEqual({
      ok: true,
    });
    expect(seen).toBe("key");
  });

  it("turns HTTP failures into actionable errors", async () => {
    const base = await serve((_req, res) => res.writeHead(429).end());
    await expect(new FetchHttpClient().getJson(`${base}/x`)).rejects.toThrow(/rate limiting/);
  });

  it("turns auth failures into a hint about the API key", async () => {
    const base = await serve((_req, res) => res.writeHead(401).end());
    await expect(new FetchHttpClient().getJson(`${base}/x`)).rejects.toThrow(
      /rejected the request/,
    );
  });

  it("times out instead of hanging", async () => {
    const base = await serve(() => undefined);
    await expect(new FetchHttpClient(50).getJson(`${base}/slow`)).rejects.toThrow(/Timed out/);
  });
});

describe("FetchFileDownloader", () => {
  it("streams the body to the destination, creating folders", async () => {
    const base = await serve((_req, res) => res.end("binary-ish"));
    const dir = await makeTempDir();
    const target = path.join(dir, "a", "b", "file.bin");

    await new FetchFileDownloader().download(`${base}/f`, target);

    expect(await readFile(target, "utf8")).toBe("binary-ish");
  });

  it("fails on a non-200 response without leaving a file", async () => {
    const base = await serve((_req, res) => res.writeHead(404).end());
    const dir = await makeTempDir();
    await expect(
      new FetchFileDownloader().download(`${base}/f`, path.join(dir, "x.bin")),
    ).rejects.toThrow(/HTTP 404/);
    await expect(readFile(path.join(dir, "x.bin"))).rejects.toThrow();
  });
});
