import { Effect, Match, Option, Schema } from "effect";
import * as Command from "foldkit/command";
import * as Dom from "foldkit/dom";
import type { Html } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";
import { defineView } from "foldkit/submodel";
import * as Subscription from "foldkit/subscription";
import type * as Update from "foldkit/update";

import * as Segmented from "../segmented/segmented.ts";
import { Palette, Scheme, fromPinnedValue, toPinnedValue } from "./scheme.ts";
import { SCHEME_ATTRIBUTE, SCHEME_STORAGE_KEY } from "./script.ts";

/** Schema for the scheme switch: the scheme in force as far as the page has seen, and the
 *  palette the reader's system prefers, which `System` prints in. */
export const Model = Schema.Struct({
  scheme: Scheme,
  systemPalette: Palette,
});

export type Model = typeof Model.Type;

/** Union of all Messages the scheme switch can produce. */
export const Message = defineMessageUnion({
  SelectedScheme: { scheme: Scheme },
  CompletedPinScheme: {},
  CompletedReadScheme: { scheme: Scheme },
  UpdatedSystemPalette: { palette: Palette },
});

export type Message = typeof Message.Type;

/** Pins a scheme on `<html data-scheme>` and remembers it on this device in `localStorage`
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

/** Reads the scheme in force from `<html data-scheme>`: what `schemeScript` pinned before the
 *  page ran, or `System` without it. */
export const ReadScheme = Command.define("ReadScheme", {
  messages: [Message.CompletedReadScheme],
  execute: Effect.sync(() =>
    Message.CompletedReadScheme({
      scheme: fromPinnedValue(
        document.documentElement.getAttribute(SCHEME_ATTRIBUTE)
      ),
    })
  ),
});

/** Creates the switch on `System` in the paper palette, as the server renders it, with
 *  `ReadScheme`, which the client runs after hydration to pick up the scheme `schemeScript`
 *  pinned before first paint (the server ignores it). The `subscriptions` bring in the
 *  system's palette. A change made in another tab is seen on the next load, not live. */
export const init = (): Update.Return<Model, Message> => ({
  model: { scheme: "System", systemPalette: "Paper" },
  commands: [ReadScheme()],
});

/** The scheme in force: the reader's choice, or `System`. */
export const scheme = (model: Model): Scheme => model.scheme;

/** The palette the page prints in: the pinned one, or under `System` the one the reader's
 *  system prefers, followed as it changes. */
export const palette = (model: Model): Palette =>
  Match.value(model.scheme).pipe(
    Match.withReturnType<Palette>(),
    Match.when("System", () => model.systemPalette),
    Match.when("Paper", () => "Paper"),
    Match.when("Plum", () => "Plum"),
    Match.exhaustive
  );

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
    UpdatedSystemPalette: ({ palette: systemPalette }) => ({
      model: modifyFields(model, { systemPalette: () => systemPalette }),
    }),
  });

/** Pins a scheme from outside the switch, such as a command palette entry. */
export const select = (model: Model, chosen: Scheme): UpdateReturn =>
  update(model, Message.SelectedScheme({ scheme: chosen }));

const systemPaletteChanges = Dom.streamFromMediaQuery({
  query: "(prefers-color-scheme: dark)",
  mapMatches: (isDark) =>
    Message.UpdatedSystemPalette({ palette: isDark ? "Plum" : "Paper" }),
});

/** Keeps the switch in step with the palette the reader's system prefers, which `System`
 *  prints in. Lift it into the application's Subscriptions. One switch per page: its key is
 *  fixed, `schemeSwitchSystemPalette`. */
export const subscriptions = Subscription.make<Model, Message>()(() => ({
  schemeSwitchSystemPalette: Subscription.persistentEntry(systemPaletteChanges),
}));

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
