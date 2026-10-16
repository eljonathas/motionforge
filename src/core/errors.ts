/** An error whose message is meant to be shown to the user (or to an agent) as is. */
export class ReelcraftError extends Error {
  readonly hint: string | undefined;

  constructor(message: string, hint?: string) {
    super(message);
    this.name = "ReelcraftError";
    this.hint = hint;
  }

  /** Message plus the actionable hint, on a second line when there is one. */
  describe(): string {
    return this.hint ? `${this.message}\n${this.hint}` : this.message;
  }
}

export function describeError(error: unknown): string {
  if (error instanceof ReelcraftError) return error.describe();
  if (error instanceof Error) return error.message;
  return String(error);
}
