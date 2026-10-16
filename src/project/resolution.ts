import { MotionForgeError } from "../core/errors.js";

export const RESOLUTIONS = ["landscape", "portrait", "square"] as const;
export type Resolution = (typeof RESOLUTIONS)[number];

export function parseResolution(value: string | undefined): Resolution {
  if (value === undefined) return "landscape";
  if ((RESOLUTIONS as readonly string[]).includes(value)) return value as Resolution;
  throw new MotionForgeError(
    `Unknown resolution "${value}".`,
    `Use one of: ${RESOLUTIONS.join(", ")}.`,
  );
}
