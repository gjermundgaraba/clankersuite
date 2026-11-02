import { Clipboard } from "@effect/platform-browser";
import { Duration, Effect, Schema } from "effect";
import * as Command from "foldkit/command";
import type { Html } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { defineTaggedUnion } from "foldkit/schema";
import { modifyFields } from "foldkit/struct";
import { defineView } from "foldkit/submodel";
import type * as Update from "foldkit/update";

import * as Announcer from "../announcer/announcer.ts";
import * as IconButton from "../icon-button/icon-button.ts";

export const CopyState = defineTaggedUnion({
  Idle: {},
  Copying: {},
  Copied: {},
});

export type CopyState = typeof CopyState.Type;

/** Schema for a copy button: whether it just copied. */
export const Model = Schema.Struct({
  id: Schema.String,
  state: CopyState,
});

export type Model = typeof Model.Type;

/** Union of all Messages a copy button can produce. */
export const Message = defineMessageUnion({
  ClickedCopy: { text: Schema.String },
  SucceededCopyText: {},
  FailedCopyText: {},
  CompletedWaitBeforeResettingWord: {},
  CompletedAnnounceCopy: {},
});

export type Message = typeof Message.Type;

/** Configuration for creating a copy button with `init`. The `id` is the button's, unique in
 *  the document. */
export type InitConfig = Readonly<{ id: string }>;

/** Creates a copy button that has copied nothing. */
export const init = (config: InitConfig): Model => ({
  id: config.id,
  state: CopyState.Idle(),
});

/** The button's id, unique in the document. */
export const id = (model: Model): string => model.id;

/** Whether the button shows that it just copied. */
export const isCopied = (model: Model): boolean =>
  CopyState.guards.Copied(model.state);

const WORD_BEAT = Duration.millis(1800);

const FAILED = "Copy failed: the clipboard is not available here.";

/** Writes the text to the clipboard through Effect's `Clipboard` port. Provide
 *  `Clipboard.layer` from `@effect/platform-browser` in the application's `resources` (or a
 *  desktop shell's own clipboard). */
export const CopyText = Command.define("CopyText", {
  args: { text: Schema.String },
  messages: [Message.SucceededCopyText, Message.FailedCopyText],
  execute: ({ text }) =>
    Effect.gen(function* () {
      const clipboard = yield* Clipboard.Clipboard;
      yield* clipboard.writeString(text);

      return Message.SucceededCopyText();
    }).pipe(Effect.orElseSucceed(() => Message.FailedCopyText())),
});

/** Waits out the beat the word or the check shows for. */
export const WaitBeforeResettingWord = Command.define(
  "WaitBeforeResettingWord",
  {
    messages: [Message.CompletedWaitBeforeResettingWord],
    execute: Effect.sleep(WORD_BEAT).pipe(
      Effect.as(Message.CompletedWaitBeforeResettingWord())
    ),
  }
);

/** Says how the copy went through the page's live region. */
export const AnnounceCopy = Command.define("AnnounceCopy", {
  args: { text: Schema.String },
  messages: [Message.CompletedAnnounceCopy],
  execute: ({ text }) =>
    Announcer.announce(text).pipe(Effect.as(Message.CompletedAnnounceCopy())),
});

/** Processes a copy button Message and returns the next Model and Commands. Its copy needs
 *  the `Clipboard` service. A parent that follows the copy reads `isCopied`. */
export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message, Clipboard.Clipboard>>(message, {
    ClickedCopy: ({ text }) =>
      CopyState.guards.Idle(model.state)
        ? {
            model: modifyFields(model, { state: () => CopyState.Copying() }),
            commands: [CopyText({ text })],
          }
        : { model },
    SucceededCopyText: () => ({
      model: modifyFields(model, { state: () => CopyState.Copied() }),
      commands: [WaitBeforeResettingWord(), AnnounceCopy({ text: "Copied." })],
    }),
    FailedCopyText: () => ({
      model: modifyFields(model, { state: () => CopyState.Idle() }),
      commands: [AnnounceCopy({ text: FAILED })],
    }),
    CompletedWaitBeforeResettingWord: () => ({
      model: modifyFields(model, { state: () => CopyState.Idle() }),
    }),
    CompletedAnnounceCopy: () => ({ model }),
  });

/** Per-render inputs passed to `view` through `h.submodel`'s `viewInputs`. */
export type ViewInputs = Readonly<{
  /** What goes on the clipboard. */
  text: string;
  /** The button's words: the glyph's name and tip (`"Copy link"`). */
  label: string;
}>;

/**
 * Copies text to the clipboard and says so, on the button and to screen readers: a quiet
 * IconButton whose copy glyph turns to a check for a beat. A failed copy is said too. Its `CopyText` Command needs `Clipboard.layer` in the application's
 * resources.
 */
export const view = defineView<Model, Message, ViewInputs>(
  (model, viewInputs, h): Html => {
    const { text, label } = viewInputs;

    return IconButton.view(
      {
        glyph: isCopied(model) ? "check" : "copy",
        label,
        onClick: Message.ClickedCopy({ text }),
        isQuiet: true,
        attributes: [h.Id(id(model))],
      },
      h
    );
  }
);
