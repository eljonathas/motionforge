import { describe, expect, it } from "vitest";
import { searchLessons, tokenize } from "../../src/memory/search.js";
import type { Lesson } from "../../src/memory/types.js";

function lesson(partial: Partial<Lesson> & { id: string }): Lesson {
  return {
    created_at: "2026-10-01T00:00:00.000Z",
    scope: "project",
    kind: "approved",
    scene_type: "",
    tags: [],
    decision: "decision",
    reason: "",
    evidence: "",
    source: "",
    ...partial,
  };
}

const ids = (lessons: Lesson[], query: Parameters<typeof searchLessons>[1]) =>
  searchLessons(lessons, query).map((s) => s.lesson.id);

describe("searchLessons", () => {
  const lessons = [
    lesson({
      id: "a",
      decision: "Used a Ken Burns photo behind the title",
      tags: ["photo", "title"],
      scene_type: "opening title",
    }),
    lesson({
      id: "b",
      decision: "Rejected flat circles for the chart",
      reason: "looked like a library demo",
      tags: ["chart"],
      scene_type: "data chart",
      kind: "rejected",
    }),
    lesson({ id: "c", decision: "Photo with slow zoom", tags: ["photo"], scene_type: "quote" }),
  ];

  it("ranks tag hits above decision hits above reason hits", () => {
    expect(ids(lessons, { text: "photo" })).toEqual(["a", "c"]);
    expect(searchLessons(lessons, { text: "photo" }).map((s) => s.score)).toEqual([5, 5]);
    expect(ids(lessons, { text: "library" })).toEqual(["b"]);
    expect(searchLessons(lessons, { text: "library" })[0]?.score).toBe(1);
  });

  it("adds tag filters and exact scene type to the score", () => {
    expect(ids(lessons, { tags: ["chart"] })).toEqual(["b"]);
    const byScene = searchLessons(lessons, { text: "photo", sceneType: "quote" });
    expect(byScene.map((s) => s.lesson.id)).toEqual(["c", "a"]);
  });

  it("breaks score ties by newest first, then by id, deterministically", () => {
    const tied = [
      lesson({ id: "z", tags: ["mood"], created_at: "2026-10-02T00:00:00.000Z" }),
      lesson({ id: "m", tags: ["mood"], created_at: "2026-10-03T00:00:00.000Z" }),
      lesson({ id: "b", tags: ["mood"], created_at: "2026-10-02T00:00:00.000Z" }),
    ];
    expect(ids(tied, { tags: ["mood"] })).toEqual(["m", "b", "z"]);
    expect(ids([...tied].reverse(), { tags: ["mood"] })).toEqual(["m", "b", "z"]);
  });

  it("returns everything newest first without a query, and nothing when nothing matches", () => {
    expect(ids(lessons, {})).toEqual(["a", "b", "c"]);
    expect(ids(lessons, { text: "zebra" })).toEqual([]);
  });

  it("filters by kind and applies the limit after sorting", () => {
    expect(ids(lessons, { kind: "rejected" })).toEqual(["b"]);
    expect(ids(lessons, { text: "photo", limit: 1 })).toEqual(["a"]);
  });

  it("ignores case and accents", () => {
    const accented = [lesson({ id: "p", decision: "Transição suave entre capítulos" })];
    expect(ids(accented, { text: "TRANSICAO capitulos" })).toEqual(["p"]);
  });
});

describe("tokenize", () => {
  it("lowercases, strips accents and punctuation, drops 1-letter words and duplicates", () => {
    expect(tokenize("Ken-Burns, a Ação! ação")).toEqual(["ken", "burns", "acao"]);
  });
});
