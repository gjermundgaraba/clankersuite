import { Option } from "effect";
import { Story } from "foldkit";
import { describe, expect, it } from "vite-plus/test";

import { Message, init, outlineMove, update } from "./outline.ts";
import type { Model, OutlineId } from "./outline.ts";

const target = (model: Model, id: OutlineId, key: string) =>
  Option.map(outlineMove(model, id, key), (move) => [
    move.id,
    move.message._tag,
  ]);

describe("the outline example", () => {
  it("folds Notes with the cursor under it, and the cursor takes Notes' place", () => {
    Story.story(
      update,
      Story.given(init().model),
      Story.message(Message.MovedCursor({ id: "minutes" })),
      Story.message(Message.ToggledNotes()),
      Story.model((model) => {
        expect(model.isNotesOpen).toBe(false);
        expect(model.cursorId).toBe("notes");
      }),
      Story.message(Message.ToggledNotes()),
      Story.model((model) => {
        expect(model.isNotesOpen).toBe(true);
        expect(model.cursorId).toBe("notes");
      })
    );
  });

  it("moves the cursor to rows on the page, and folds with the side arrows", () => {
    const open = init().model;
    const folded = { ...open, isNotesOpen: false };

    expect(target(open, "notes", "ArrowDown")).toStrictEqual(
      Option.some(["agenda", "MovedCursor"])
    );
    expect(target(folded, "notes", "ArrowDown")).toStrictEqual(
      Option.some(["later", "MovedCursor"])
    );
    expect(target(open, "notes", "ArrowUp")).toStrictEqual(Option.none());
    expect(target(open, "agenda", "End")).toStrictEqual(
      Option.some(["later", "MovedCursor"])
    );
    expect(target(open, "later", "Home")).toStrictEqual(
      Option.some(["notes", "MovedCursor"])
    );
    expect(target(open, "notes", "ArrowRight")).toStrictEqual(
      Option.some(["agenda", "MovedCursor"])
    );
    expect(target(folded, "notes", "ArrowRight")).toStrictEqual(
      Option.some(["notes", "ToggledNotes"])
    );
    expect(target(open, "minutes", "ArrowLeft")).toStrictEqual(
      Option.some(["notes", "MovedCursor"])
    );
    expect(target(open, "notes", "ArrowLeft")).toStrictEqual(
      Option.some(["notes", "ToggledNotes"])
    );
    expect(target(folded, "notes", "ArrowLeft")).toStrictEqual(Option.none());
    expect(target(open, "later", "ArrowRight")).toStrictEqual(Option.none());
  });
});
