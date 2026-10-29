import { Clipboard } from "@effect/platform-browser";
import { Array, Effect, Option } from "effect";
import { Scene, Story } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { describe, expect, it } from "vite-plus/test";

import type { Cell, GlyphName } from "../glyph/glyphs.ts";
import { glyphs } from "../glyph/glyphs.ts";
import * as CopyButton from "./copy-button.ts";

const fresh = CopyButton.init({ id: "copy-link" });

const resolveCopy = Story.Command.resolve(
  CopyButton.CopyText({ text: "https://example.com/sample" }),
  CopyButton.Message.SucceededCopyText()
);

describe("CopyButton update", () => {
  it("copies, says so for a beat, then goes back", () => {
    Story.story(
      CopyButton.update,
      Story.given(fresh),
      Story.message(
        CopyButton.Message.ClickedCopy({ text: "https://example.com/sample" })
      ),
      Story.model((model) => {
        expect(CopyButton.CopyState.guards.Copying(model.state)).toBe(true);
        expect(CopyButton.isCopied(model)).toBe(false);
      }),
      resolveCopy,
      Story.model((model) => {
        expect(CopyButton.isCopied(model)).toBe(true);
      }),
      Story.Command.resolve(
        CopyButton.AnnounceCopy({ text: "Copied." }),
        CopyButton.Message.CompletedAnnounceCopy()
      ),
      Story.Command.resolve(
        CopyButton.WaitBeforeResettingWord,
        CopyButton.Message.CompletedWaitBeforeResettingWord()
      ),
      Story.model((model) => {
        expect(CopyButton.isCopied(model)).toBe(false);
      })
    );
  });

  it("takes no second click until the beat has ended", () => {
    Story.story(
      CopyButton.update,
      Story.given({ ...fresh, state: CopyButton.CopyState.Copied() }),
      Story.message(CopyButton.Message.ClickedCopy({ text: "again" })),
      Story.Command.expectNone(),
      Story.model((model) => {
        expect(CopyButton.isCopied(model)).toBe(true);
      })
    );
  });

  it("takes no second click while the write is out", () => {
    Story.story(
      CopyButton.update,
      Story.given({ ...fresh, state: CopyButton.CopyState.Copying() }),
      Story.message(CopyButton.Message.ClickedCopy({ text: "again" })),
      Story.Command.expectNone(),
      Story.model((model) => {
        expect(CopyButton.CopyState.guards.Copying(model.state)).toBe(true);
      })
    );
  });

  it("says a failed copy", () => {
    Story.story(
      CopyButton.update,
      Story.given(fresh),
      Story.message(CopyButton.Message.ClickedCopy({ text: "secret" })),
      Story.Command.resolve(
        CopyButton.CopyText,
        CopyButton.Message.FailedCopyText()
      ),
      Story.Command.resolve(
        CopyButton.AnnounceCopy({
          text: "Copy failed: the clipboard is not available here.",
        }),
        CopyButton.Message.CompletedAnnounceCopy()
      ),
      Story.model((model) => {
        expect(CopyButton.isCopied(model)).toBe(false);
      })
    );
  });
});

const runCopy = async (clipboard: Clipboard.Clipboard) =>
  await Effect.runPromise(
    CopyButton.CopyText({ text: "sample" }).effect.pipe(
      Effect.provideService(Clipboard.Clipboard, clipboard)
    )
  );

const clipboardWith = (writeString: Clipboard.Clipboard["writeString"]) =>
  Clipboard.make({
    read: Effect.succeed([]),
    readString: Effect.succeed(""),
    write: () => Effect.void,
    writeString,
  });

describe("CopyButton CopyText", () => {
  it("writes the text through the Clipboard port", async () => {
    const written: string[] = [];

    const message = await runCopy(
      clipboardWith((text) =>
        Effect.sync(() => written.push(text)).pipe(Effect.asVoid)
      )
    );

    expect(written).toStrictEqual(["sample"]);
    expect(message).toStrictEqual(CopyButton.Message.SucceededCopyText());
  });

  it("turns a refused write into FailedCopyText", async () => {
    const message = await runCopy(
      clipboardWith(() =>
        Effect.fail(
          new Clipboard.ClipboardError({ message: "denied", cause: undefined })
        )
      )
    );

    expect(message).toStrictEqual(CopyButton.Message.FailedCopyText());
  });
});

const cellOnlyIn = (name: GlyphName, other: GlyphName): string => {
  const [x, y, width, height] = Option.getOrThrow(
    Array.findFirst(
      glyphs[name],
      (cell: Cell) =>
        !Array.some(
          glyphs[other],
          (otherCell) => otherCell.join(",") === cell.join(",")
        )
    )
  );

  return `button rect[x="${x}"][y="${y}"][width="${width}"][height="${height}"]`;
};

const checkCell = Scene.selector(cellOnlyIn("check", "copy"));
const copyCell = Scene.selector(cellOnlyIn("copy", "check"));

const copyView =
  (variant: CopyButton.Variant) =>
  (model: CopyButton.Model, h: HtmlBuilder<CopyButton.Message>) =>
    CopyButton.view(
      model,
      {
        text: "https://example.com/sample",
        label: variant === "Icon" ? "Copy link" : "copy",
        variant,
      },
      h
    );

describe("CopyButton view", () => {
  it("is a quiet glyph named by its label, its tip the same, that turns to a check", () => {
    Scene.scene(
      { update: CopyButton.update, view: copyView("Icon") },
      Scene.given(fresh),
      Scene.expect(Scene.role("button", { name: "Copy link" })).toHaveClass(
        "quiet"
      ),
      Scene.expect(Scene.role("button", { name: "Copy link" })).toHaveAttr(
        "data-tip",
        "Copy link"
      ),
      Scene.expect(Scene.role("button", { name: "Copy link" })).toHaveId(
        "copy-link"
      ),
      Scene.expect(copyCell).toExist(),
      Scene.click(Scene.role("button", { name: "Copy link" })),
      Scene.expect(copyCell).toExist(),
      Scene.expect(checkCell).toBeAbsent(),
      Scene.Command.resolve(
        CopyButton.CopyText,
        CopyButton.Message.SucceededCopyText()
      ),
      Scene.expect(checkCell).toExist(),
      Scene.expect(copyCell).toBeAbsent(),
      Scene.expect(Scene.role("button", { name: "Copy link" })).toExist(),
      Scene.Command.resolveAll(
        [CopyButton.AnnounceCopy, CopyButton.Message.CompletedAnnounceCopy()],
        [
          CopyButton.WaitBeforeResettingWord,
          CopyButton.Message.CompletedWaitBeforeResettingWord(),
        ]
      ),
      Scene.expect(copyCell).toExist(),
      Scene.expect(checkCell).toBeAbsent()
    );
  });

  it("as a button, turns its word to copied and holds for the beat", () => {
    Scene.scene(
      { update: CopyButton.update, view: copyView("Button") },
      Scene.given({ ...fresh, state: CopyButton.CopyState.Copied() }),
      Scene.expect(Scene.role("button")).toHaveClass("done"),
      Scene.expect(Scene.role("button")).toHaveAttr("aria-disabled", "true"),
      Scene.expect(Scene.selector(".btn-words [aria-hidden]")).toHaveText(
        "copy"
      )
    );
  });
});
