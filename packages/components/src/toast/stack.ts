import { Toast as UiToast } from "@foldkit/ui";
import { Array, Option, Schema } from "effect";

/** `Ok`: a committed change, in ink, gone after the hold. `Error`: red, and it stays until it
 *  is dismissed or taken back; like every tone it is said politely. `Quiet`: news, nothing
 *  wrong, on the head tint, gone after the hold. */
export const Tone = Schema.Literals(["Ok", "Error", "Quiet"]);

export type Tone = typeof Tone.Type;

export const Payload = Schema.Struct({
  tone: Tone,
  title: Schema.String,
  maybeBody: Schema.Option(Schema.String),
});

export type Payload = typeof Payload.Type;

const stack = UiToast.make(Payload);

export const {
  Entry,
  Model,
  Message,
  OutMessage,
  init,
  update,
  show,
  dismiss,
  view,
} = stack;

export type Entry = typeof stack.Entry.Type;

export type Model = typeof stack.Model.Type;

export type Message = typeof stack.Message.Type;

export const showing = (model: Model): readonly Entry[] =>
  Array.filter(model.entries, (entry) => entry.animation.isShowing);

export const newestId = (model: Model): Option.Option<string> =>
  Option.map(Array.last(model.entries), (entry) => entry.id);

export const hold = (model: Model, entryId: string) =>
  update(model, Message.HoveredEntry({ entryId }));

export const release = (model: Model, entryId: string) =>
  update(model, Message.LeftEntry({ entryId }));
