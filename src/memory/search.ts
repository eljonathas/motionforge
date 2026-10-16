import type { Lesson, LessonKind } from "./types.js";

export interface LessonQuery {
  text?: string | undefined;
  tags?: readonly string[] | undefined;
  sceneType?: string | undefined;
  kind?: LessonKind | undefined;
  limit?: number | undefined;
}

export interface ScoredLesson {
  lesson: Lesson;
  score: number;
}

const WEIGHTS = {
  tagWord: 3,
  tagFilter: 4,
  sceneWord: 2,
  sceneExact: 5,
  decision: 2,
  reason: 1,
  evidence: 1,
} as const;

export function tokenize(text: string): string[] {
  const words = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length >= 2);
  return [...new Set(words)];
}

function scoreLesson(lesson: Lesson, query: LessonQuery): number {
  let score = 0;
  const tags = new Set(lesson.tags.flatMap(tokenize));
  const scene = new Set(tokenize(lesson.scene_type));
  const decision = new Set(tokenize(lesson.decision));
  const reason = new Set(tokenize(lesson.reason));
  const evidence = new Set(tokenize(lesson.evidence));

  for (const word of tokenize(query.text ?? "")) {
    if (tags.has(word)) score += WEIGHTS.tagWord;
    if (scene.has(word)) score += WEIGHTS.sceneWord;
    if (decision.has(word)) score += WEIGHTS.decision;
    if (reason.has(word)) score += WEIGHTS.reason;
    if (evidence.has(word)) score += WEIGHTS.evidence;
  }
  for (const tag of (query.tags ?? []).flatMap(tokenize))
    if (tags.has(tag)) score += WEIGHTS.tagFilter;
  if (
    query.sceneType &&
    tokenize(query.sceneType).join(" ") === tokenize(lesson.scene_type).join(" ")
  ) {
    score += WEIGHTS.sceneExact;
  }
  return score;
}

/**
 * Keyword and tag scoring, no embeddings. Order is fully deterministic: score, then newest first,
 * then id. With no text, tags or scene type, every lesson matches (newest first).
 */
export function searchLessons(lessons: readonly Lesson[], query: LessonQuery): ScoredLesson[] {
  const filtering =
    Boolean(query.text?.trim()) || (query.tags?.length ?? 0) > 0 || Boolean(query.sceneType);
  const scored = lessons
    .filter((l) => query.kind === undefined || l.kind === query.kind)
    .map((lesson) => ({ lesson, score: scoreLesson(lesson, query) }))
    .filter((s) => !filtering || s.score > 0);
  scored.sort(
    (a, b) =>
      b.score - a.score ||
      b.lesson.created_at.localeCompare(a.lesson.created_at) ||
      a.lesson.id.localeCompare(b.lesson.id),
  );
  return query.limit === undefined ? scored : scored.slice(0, query.limit);
}
