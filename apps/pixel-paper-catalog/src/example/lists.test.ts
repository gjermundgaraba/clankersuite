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
  it("selects rows one by one or all at once, and archiving clears the selection", () => {
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
      }),
      Story.message(ListsExample.Message.ToggledAll({ isAll: true })),
      Story.model((model) => {
        expect(model.selectedIds).toStrictEqual(["notes", "room", "drafts"]);
      }),
      Story.message(ListsExample.Message.ClickedArchive()),
      Story.model((model) => {
        expect(model.selectedIds).toStrictEqual([]);
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
