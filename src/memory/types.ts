import { z } from "zod";

export const LESSON_KINDS = ["approved", "rejected", "edited", "note"] as const;
export const LESSON_SCOPES = ["project", "global"] as const;

export const LessonSchema = z.object({
  id: z.string().min(1),
  created_at: z.string().min(1),
  scope: z.enum(LESSON_SCOPES),
  kind: z.enum(LESSON_KINDS),
  scene_type: z.string(),
  tags: z.array(z.string()),
  decision: z.string().min(1),
  reason: z.string(),
  /** A frame path or a code snippet that shows the choice. */
  evidence: z.string(),
  /** Who or what recorded it, for example "user feedback" or "agent review". */
  source: z.string(),
});

export type Lesson = z.infer<typeof LessonSchema>;
export type LessonKind = Lesson["kind"];
export type LessonScope = Lesson["scope"];

export interface NewLesson {
  kind: LessonKind;
  decision: string;
  scene_type?: string | undefined;
  tags?: readonly string[] | undefined;
  reason?: string | undefined;
  evidence?: string | undefined;
  source?: string | undefined;
}
