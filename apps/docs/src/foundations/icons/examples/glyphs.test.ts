import { Announcer } from "@gjermundgaraba/components";
import { Glyph } from "@gjermundgaraba/icons";
import { Array, Option, Record } from "effect";
import { Scene, Story } from "foldkit";
import { describe, expect, it } from "vite-plus/test";

import {
  CopyGlyphName,
  FAMILIES,
  Message,
  init,
  update,
  view,
} from "./glyphs.ts";

const { model: EMPTY } = init();

describe("the glyphs example", () => {
  it("lists every glyph once", () => {
    const listed = Array.flatMap(FAMILIES, ([, names]) => names);

    expect(listed.toSorted()).toStrictEqual(
      Record.keys(Glyph.glyphs).toSorted()
    );
  });

  it("copies a glyph's name, flashes its button and says so", () => {
    Scene.scene(
      { update, view },
      Scene.given(EMPTY),
      Scene.click(Scene.role("button", { name: "Copy box" })),
      Scene.Command.expectExact(CopyGlyphName({ name: "box" })),
      Scene.Command.resolve(
        CopyGlyphName,
        Message.SucceededCopyGlyphName({ name: "box" })
      ),
      Scene.Command.expectExact(
        Announcer.Flash({ selector: "#glyph-box" }),
        Announcer.Announce({ text: "Copied box." })
      ),
      Scene.Command.resolve(Announcer.Flash, Message.CompletedFlash()),
      Scene.Command.resolve(Announcer.Announce, Message.CompletedAnnounce())
    );
  });

  it("says the copy failed when the clipboard refuses", () => {
    Story.story(
      update,
      Story.given(EMPTY),
      Story.message(Message.ClickedGlyph({ name: "box" })),
      Story.Command.resolve(CopyGlyphName, Message.FailedCopyGlyphName()),
      Story.Command.expectExact(
        Announcer.Announce({
          text: "Copy failed: the clipboard is not available here.",
        })
      ),
      Story.Command.resolve(Announcer.Announce, Message.CompletedAnnounce())
    );
  });

  it("finds a glyph by part of its name", () => {
    Scene.scene(
      { update, view },
      Scene.given(EMPTY),
      Scene.type(Scene.role("searchbox"), "trend"),
      Scene.expect(Scene.role("button", { name: "Copy trend-up" })).toExist(),
      Scene.expect(Scene.role("button", { name: "Copy box" })).not.toExist()
    );
  });

  it("shows one family, another in its place, and all again; clear drops words and family at once", () => {
    Story.story(
      update,
      Story.given(EMPTY),
      Story.message(Message.ToggledFamily({ family: "direction" })),
      Story.model((model) => {
        expect(model.maybeFamily).toStrictEqual(Option.some("direction"));
      }),
      Story.message(Message.ToggledFamily({ family: "documents" })),
      Story.model((model) => {
        expect(model.maybeFamily).toStrictEqual(Option.some("documents"));
      }),
      Story.message(Message.ToggledFamily({ family: "documents" })),
      Story.model((model) => {
        expect(model.maybeFamily).toStrictEqual(Option.none());
      }),
      Story.message(Message.ToggledFamily({ family: "direction" })),
      Story.message(Message.UpdatedQuery({ value: "up" })),
      Story.message(Message.ClickedClearFilter()),
      Story.model((model) => {
        expect(model).toStrictEqual(EMPTY);
      })
    );
  });

  it("offers to clear the filter when no glyph matches", () => {
    Scene.scene(
      { update, view },
      Scene.given({ query: "zzz", maybeFamily: Option.none() }),
      Scene.expect(
        Scene.role("heading", { name: "No glyph by that name" })
      ).toExist(),
      Scene.click(Scene.role("button", { name: "clear the filter" })),
      Scene.expect(Scene.role("button", { name: "Copy box" })).toExist()
    );
  });
});
