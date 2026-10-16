import { vi } from "vitest";
import { createContext, type Context } from "../../src/context.js";
import { buildProgram } from "../../src/program.js";

export interface CliRun {
  stdout: string;
  stderr: string;
  exitCode: number | undefined;
}

/** Runs the real commander program in-process with an injected context and captured output. */
export async function runCli(args: string[], overrides: Partial<Context> = {}): Promise<CliRun> {
  let stdout = "";
  let stderr = "";
  const out = vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
    stdout += String(chunk);
    return true;
  });
  const err = vi.spyOn(process.stderr, "write").mockImplementation((chunk) => {
    stderr += String(chunk);
    return true;
  });
  process.exitCode = undefined;
  try {
    const program = await buildProgram(createContext(overrides));
    program.exitOverride();
    await program.parseAsync(["node", "reelcraft", ...args]);
    return { stdout, stderr, exitCode: process.exitCode };
  } finally {
    out.mockRestore();
    err.mockRestore();
    process.exitCode = undefined;
  }
}
