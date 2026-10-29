import { Announcer } from "@gjermundgaraba/pixel-paper";
import { Option } from "effect";
import { Story } from "foldkit";
import { describe, expect, it } from "vite-plus/test";

import * as FoundationsPage from "./foundations.ts";

describe("Foundations page", () => {
  it("copies a glyph's name, flashes its tile and says so", () => {
    Story.story(
      FoundationsPage.update,
      Story.given(FoundationsPage.init()),
      Story.message(FoundationsPage.Message.ClickedGlyph({ name: "box" })),
      Story.Command.expectExact(FoundationsPage.CopyGlyphName({ name: "box" })),
      Story.Command.resolve(
        FoundationsPage.CopyGlyphName,
        FoundationsPage.Message.SucceededCopyGlyphName({ name: "box" })
      ),
      Story.Command.expectExact(
        Announcer.Flash({ selector: "#glyph-box" }),
        Announcer.Announce({ text: "Copied box." })
      ),
      Story.Command.resolve(
        Announcer.Flash,
        FoundationsPage.Message.CompletedFlash()
      ),
      Story.Command.resolve(
        Announcer.Announce,
        FoundationsPage.Message.CompletedAnnounce()
      )
    );
  });

  it("says the copy failed when the clipboard refuses", () => {
    Story.story(
      FoundationsPage.update,
      Story.given(FoundationsPage.init()),
      Story.message(FoundationsPage.Message.ClickedGlyph({ name: "box" })),
      Story.Command.resolve(
        FoundationsPage.CopyGlyphName,
        FoundationsPage.Message.FailedCopyGlyphName()
      ),
      Story.Command.expectExact(
        Announcer.Announce({
          text: "Copy failed: the clipboard is not available here.",
        })
      ),
      Story.Command.resolve(
        Announcer.Announce,
        FoundationsPage.Message.CompletedAnnounce()
      )
    );
  });

  it("flashes the box and says the change was committed", () => {
    Story.story(
      FoundationsPage.update,
      Story.given(FoundationsPage.init()),
      Story.message(FoundationsPage.Message.ClickedFlash()),
      Story.Command.expectExact(
        Announcer.Flash({ selector: "#motion-flash-box" }),
        Announcer.Announce({ text: "Committed." })
      ),
      Story.Command.resolve(
        Announcer.Flash,
        FoundationsPage.Message.CompletedFlash()
      ),
      Story.Command.resolve(
        Announcer.Announce,
        FoundationsPage.Message.CompletedAnnounce()
      )
    );
  });

  it("shows one glyph family, another in its place, and all again; clear drops words and family at once", () => {
    Story.story(
      FoundationsPage.update,
      Story.given(FoundationsPage.init()),
      Story.message(
        FoundationsPage.Message.ToggledFamily({ family: "arrows" })
      ),
      Story.model((model) => {
        expect(model.maybeFamily).toStrictEqual(Option.some("arrows"));
      }),
      Story.message(FoundationsPage.Message.ToggledFamily({ family: "files" })),
      Story.model((model) => {
        expect(model.maybeFamily).toStrictEqual(Option.some("files"));
      }),
      Story.message(FoundationsPage.Message.ToggledFamily({ family: "files" })),
      Story.model((model) => {
        expect(model.maybeFamily).toStrictEqual(Option.none());
      }),
      Story.message(
        FoundationsPage.Message.ToggledFamily({ family: "arrows" })
      ),
      Story.message(FoundationsPage.Message.UpdatedGlyphQuery({ value: "up" })),
      Story.message(FoundationsPage.Message.ClickedClearGlyphFilter()),
      Story.model((model) => {
        expect(model).toStrictEqual(FoundationsPage.init());
      })
    );
  });
});
