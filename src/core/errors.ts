/** An error whose message is meant to be shown to the user (or to an agent) as is; the hint is on its own line. */
export class ReelcraftError extends Error {
  readonly hint: string | undefined;

  constructor(message: string, hint?: string) {
    super(hint ? `${message}\n${hint}` : message);
    this.name = "ReelcraftError";
    this.hint = hint;
  }
}

export function describeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
