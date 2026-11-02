import { Option } from "effect";
import { Story } from "foldkit";
import { describe, expect, it } from "vite-plus/test";

import * as ListsExample from "./lists.ts";

const target = (
  model: ListsExample.Model,
  id: ListsExample.OutlineId,
  key: string
) =>
  Option.map(ListsExample.outlineMove(model, id, key), (move) => [
    move.id,
    move.message._tag,
  ]);

describe("Lists example", () => {
  it("selects and clears rows one by one", () => {
    Story.story(
      ListsExample.update,
      Story.given(ListsExample.init()),
      Story.message(
        ListsExample.Message.ToggledItem({ id: "notes", isChecked: true })
      ),
      Story.model((model) => {
        expect(model.selectedIds).toStrictEqual(["room", "notes"]);
      }),
      Story.message(
        ListsExample.Message.ToggledItem({ id: "room", isChecked: false })
      ),
      Story.model((model) => {
        expect(model.selectedIds).toStrictEqual(["notes"]);
      })
    );
  });

  it("folds Notes with the cursor under it, and the cursor takes Notes' place", () => {
    Story.story(
      ListsExample.update,
      Story.given(ListsExample.init()),
      Story.message(ListsExample.Message.MovedCursor({ id: "minutes" })),
      Story.message(ListsExample.Message.ToggledNotes()),
      Story.model((model) => {
        expect(model.isNotesOpen).toBe(false);
        expect(model.cursorId).toBe("notes");
      }),
      Story.message(ListsExample.Message.ToggledNotes()),
      Story.model((model) => {
        expect(model.isNotesOpen).toBe(true);
        expect(model.cursorId).toBe("notes");
      })
    );
  });

  it("moves the outline's cursor to rows on the page, and folds with the side arrows", () => {
    const open = ListsExample.init();
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
