import { Effect, Option, Schema } from "effect";
import * as Command from "foldkit/command";
import * as Render from "foldkit/render";

import * as Announcer from "../announcer/announcer.ts";
import { htmlElement } from "../dom/html-element.ts";
import { Message } from "./message.ts";
import { focusInto, paneElement } from "./model.ts";

/** Says a focus move, a move or a step of a drag through the page's live region (as
 *  `Announcer.Announce` does). */
export const AnnounceReel = Command.define("AnnounceReel", {
  args: { text: Schema.String },
  messages: [Message.CompletedAnnounceReel],
  execute: ({ text }) =>
    Announcer.announce(text).pipe(Effect.as(Message.CompletedAnnounceReel())),
});

/** Focuses the pane `paneHook` names, unless focus is already inside it: the control in it
 *  marked `data-gg-reel-focus` (a terminal's input), or the pane itself. It does not scroll;
 *  ScrollIntoView does. */
export const FocusPane = Command.define("FocusPane", {
  args: { paneHook: Schema.String },
  messages: [Message.CompletedFocusPane],
  execute: ({ paneHook: hook }) =>
    Effect.gen(function* () {
      yield* Render.afterCommit;
      yield* Effect.sync(() => {
        Option.map(
          Option.filter(
            paneElement(hook),
            (pane) => !pane.contains(document.activeElement)
          ),
          focusInto
        );
      });

      return Message.CompletedFocusPane();
    }),
});

/** Focuses the tab `tabHook` names, for a tab the arrows step to: the keyboard stays in the
 *  tab list until the reader goes into the pane. */
export const FocusTab = Command.define("FocusTab", {
  args: { tabHook: Schema.String },
  messages: [Message.CompletedFocusTab],
  execute: ({ tabHook: hook }) =>
    Effect.gen(function* () {
      yield* Render.afterCommit;
      yield* Effect.sync(() => {
        Option.map(
          htmlElement(`[data-gg-reel-tab="${CSS.escape(hook)}"]`),
          (tab) => {
            tab.focus();
          }
        );
      });

      return Message.CompletedFocusTab();
    }),
});

/** Focuses the pane `paneHook` names only where focus was lost (it left with the pane that
 *  held it), so focus the reader put somewhere else stays there. */
export const RestoreFocus = Command.define("RestoreFocus", {
  args: { paneHook: Schema.String },
  messages: [Message.CompletedRestoreFocus],
  execute: ({ paneHook: hook }) =>
    Effect.gen(function* () {
      yield* Render.afterCommit;
      yield* Effect.sync(() => {
        const active = document.activeElement;

        if (active === null || active === document.body) {
          Option.map(paneElement(hook), focusInto);
        }
      });

      return Message.CompletedRestoreFocus();
    }),
});

/** Scrolls the pane or column `hook` names into view, by the least distance either way, its
 *  gutter kept by the stylesheet's `scroll-margin`, once the render that placed it is in the
 *  page. It jumps: motion is stepped or instant, and a follow is instant. */
export const ScrollIntoView = Command.define("ScrollIntoView", {
  args: { hook: Schema.String },
  messages: [Message.CompletedScrollIntoView],
  execute: ({ hook }) =>
    Effect.gen(function* () {
      yield* Render.afterCommit;
      yield* Effect.sync(() => {
        document
          .querySelector(
            `[data-gg-reel-pane="${CSS.escape(hook)}"], [data-gg-reel-hook="${CSS.escape(hook)}"]`
          )
          ?.scrollIntoView({ block: "nearest", inline: "nearest" });
      });

      return Message.CompletedScrollIntoView();
    }),
});
