import { Effect, Schema } from "effect";
import * as Command from "foldkit/command";
import * as Dom from "foldkit/dom";
import { defineMessageUnion } from "foldkit/message";

/** What `Focus` reports. A component that runs `Focus` puts `CompletedFocus: {}` in its own
 *  Message union, which this tag matches; code that returns `Focus` with no union of its own
 *  (a helper shared by several forms) types its Commands with this one. */
export const Message = defineMessageUnion({
  CompletedFocus: {},
});

export type Message = typeof Message.Type;

/** Focuses the element with this id, once it is in the page; nothing when it is not. */
export const Focus = Command.define("Focus", {
  args: { id: Schema.String },
  messages: [Message.CompletedFocus],
  execute: ({ id }) =>
    Dom.focus(`#${CSS.escape(id)}`).pipe(
      Effect.ignore,
      Effect.as(Message.CompletedFocus())
    ),
});
