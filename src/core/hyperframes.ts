import { spawn } from "node:child_process";
import path from "node:path";
import { MotionForgeError } from "./errors.js";
import { findPackageDir } from "./packages.js";

export interface RunResult {
  code: number;
  stdout: string;
  stderr: string;
}

/** Environment for every HyperFrames call: telemetry is always off. */
export function hyperframesEnv(base: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  return { ...base, HYPERFRAMES_NO_TELEMETRY: "1" };
}

function hyperframesBin(): string {
  return path.join(findPackageDir("hyperframes"), "bin", "hyperframes.mjs");
}

/**
 * Runs the HyperFrames CLI bundled with motionforge. Uses the current Node binary directly (no shell)
 * so quoting and path separators behave the same on macOS, Windows and Linux.
 */
export function runHyperframes(
  args: readonly string[],
  cwd: string,
  timeoutMs = 20 * 60_000,
): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [hyperframesBin(), ...args], {
      cwd,
      env: hyperframesEnv(),
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => child.kill(), timeoutMs);
    child.stdout.on("data", (chunk: Buffer) => (stdout += chunk.toString("utf8")));
    child.stderr.on("data", (chunk: Buffer) => (stderr += chunk.toString("utf8")));
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(new MotionForgeError(`Could not start HyperFrames: ${error.message}`));
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code: code ?? 1, stdout, stderr });
    });
  });
}

// eslint-disable-next-line no-control-regex -- strips terminal colour codes from child output
const ANSI = /\u001b\[[0-9;]*m/g;

/** Last lines of combined output without colour codes, for error messages. */
export function tailOutput(result: RunResult, lines = 15): string {
  const all = `${result.stdout}\n${result.stderr}`.replace(ANSI, "").trim().split(/\r?\n/);
  return all.slice(-lines).join("\n");
}
