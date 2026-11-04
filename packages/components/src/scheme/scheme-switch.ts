import { Effect, Option, Schema } from "effect";
import * as Command from "foldkit/command";
import type { Html } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";
import { defineView } from "foldkit/submodel";
import type * as Update from "foldkit/update";

import * as Segmented from "../segmented/segmented.ts";
import { Scheme, fromPinnedValue, toPinnedValue } from "./scheme.ts";
import { SCHEME_ATTRIBUTE, SCHEME_STORAGE_KEY } from "./script.ts";

/** Schema for the scheme switch: the scheme in force as far as the page has seen. */
export const Model = Schema.Struct({
  scheme: Scheme,
});

export type Model = typeof Model.Type;

/** Union of all Messages the scheme switch can produce. */
export const Message = defineMessageUnion({
  SelectedScheme: { scheme: Scheme },
  CompletedPinScheme: {},
  CompletedReadScheme: { scheme: Scheme },
});

export type Message = typeof Message.Type;

/** Pins a scheme on `<html data-color-scheme>` and remembers it on this device in `localStorage`
 *  under the key `schemeScript` reads; `System` removes both. The attribute is written first,
 *  so storage that refuses (blocked or full) still switches the page; the choice is just not
 *  remembered. */
export const PinScheme = Command.define("PinScheme", {
  args: { scheme: Scheme },
  messages: [Message.CompletedPinScheme],
  execute: ({ scheme }) =>
    Effect.try(() => {
      Option.match(toPinnedValue(scheme), {
        onNone: () => {
          document.documentElement.removeAttribute(SCHEME_ATTRIBUTE);
          localStorage.removeItem(SCHEME_STORAGE_KEY);
        },
        onSome: (value) => {
          document.documentElement.setAttribute(SCHEME_ATTRIBUTE, value);
          localStorage.setItem(SCHEME_STORAGE_KEY, value);
        },
      });
    }).pipe(Effect.ignore, Effect.as(Message.CompletedPinScheme())),
});

const ReadScheme = Command.define("ReadScheme", {
  messages: [Message.CompletedReadScheme],
  execute: Effect.sync(() =>
    Message.CompletedReadScheme({
      scheme: fromPinnedValue(
        document.documentElement.getAttribute(SCHEME_ATTRIBUTE)
      ),
    })
  ),
});

/** Creates the switch on `System` in the paper palette, as the server renders it, with a
 *  Command that reads `<html data-color-scheme>` once the client runs it after hydration: the scheme
 *  `schemeScript` pinned before first paint (the server ignores it), or `System` without one. A change made in another tab is seen on the next load, not live. */
export const init = (): Update.Return<Model, Message> => ({
  model: { scheme: "System" },
  commands: [ReadScheme()],
});

/** The scheme in force: the reader's choice, or `System`. */
export const scheme = (model: Model): Scheme => model.scheme;

type UpdateReturn = Update.Return<Model, Message>;

/** Processes a scheme switch Message and returns the next Model and Commands. */
export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    SelectedScheme: ({ scheme: chosen }) => ({
      model: modifyFields(model, { scheme: () => chosen }),
      commands: [PinScheme({ scheme: chosen })],
    }),
    CompletedPinScheme: () => ({ model }),
    CompletedReadScheme: ({ scheme: read }) => ({
      model: modifyFields(model, { scheme: () => read }),
    }),
  });

/** Pins a scheme from outside the switch, such as a command palette entry. */
export const select = (model: Model, chosen: Scheme): UpdateReturn =>
  update(model, Message.SelectedScheme({ scheme: chosen }));

const SEGMENTS: ReadonlyArray<Segmented.Segment<Scheme>> = [
  { value: "System", label: "system" },
  { value: "Paper", label: "paper" },
  { value: "Plum", label: "plum" },
];

/** System, paper, plum: two palettes of one system, or whatever the reader's system prefers.
 *  Put `schemeScript` in the page's `<head>` so a remembered choice applies before first
 *  paint. */
export const view = defineView<Model, Message>((model, h): Html =>
  Segmented.view(
    {
      label: "Palette",
      options: SEGMENTS,
      value: model.scheme,
      onSelect: (chosen) => Message.SelectedScheme({ scheme: chosen }),
    },
    h
  )
);
