#!/usr/bin/env node
import { printError } from "./commands/output.js";
import { createContext } from "./context.js";
import { describeError } from "./core/errors.js";
import { buildProgram } from "./program.js";

async function main(): Promise<void> {
  const program = await buildProgram(createContext());
  try {
    await program.parseAsync(process.argv);
  } catch (error) {
    printError(`error: ${describeError(error)}`);
    process.exitCode = 1;
  }
}

await main();
