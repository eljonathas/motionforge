/** Output goes through these two functions so tests (and the MCP server's stdout) stay clean. */
export function print(text: string): void {
  process.stdout.write(`${text}\n`);
}

export function printError(text: string): void {
  process.stderr.write(`${text}\n`);
}
