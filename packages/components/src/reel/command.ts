import { Effect, Option, Schema } from "effect";
import * as Command from "foldkit/command";
import * as Render from "foldkit/render";

import * as Announcer from "../announcer/announcer.ts";
import { htmlElement } from "../dom/html-element.ts";
import { Message } from "./message.ts";
import type { Model } from "./model.ts";
import { focusInto, paneElement, partSelector } from "./model.ts";

/** Says a focus move, a move or a step of a drag through the page's live region (as
 *  `Announcer.Announce` does). */
export const AnnounceReel = Command.define("AnnounceReel", {
  args: { text: Schema.String },
  messages: [Message.CompletedAnnounceReel],
  execute: ({ text }) =>
    Announcer.announce(text).pipe(Effect.as(Message.CompletedAnnounceReel())),
});

/** Focuses the reel's pane `paneId`, unless focus is already inside it: the control in it
 *  marked `data-gg-reel-focus` (a terminal's input), or the pane itself. It does not scroll;
 *  ScrollIntoView does. */
export const FocusPane = Command.define("FocusPane", {
  args: { reelId: Schema.String, paneId: Schema.String },
  messages: [Message.CompletedFocusPane],
  execute: ({ reelId, paneId }) =>
    Effect.gen(function* () {
      yield* Render.afterCommit;
      yield* Effect.sync(() => {
        Option.map(
          Option.filter(
            paneElement(reelId, paneId),
            (pane) => !pane.contains(document.activeElement)
          ),
          focusInto
        );
      });

      return Message.CompletedFocusPane();
    }),
});

/** Focuses the reel's tab for the pane `paneId`, for a tab the arrows step to: the keyboard stays in the
 *  tab list until the reader goes into the pane. */
export const FocusTab = Command.define("FocusTab", {
  args: { reelId: Schema.String, paneId: Schema.String },
  messages: [Message.CompletedFocusTab],
  execute: ({ reelId, paneId }) =>
    Effect.gen(function* () {
      yield* Render.afterCommit;
      yield* Effect.sync(() => {
        Option.map(htmlElement(partSelector(reelId, "tab", paneId)), (tab) => {
          tab.focus();
        });
      });

      return Message.CompletedFocusTab();
    }),
});

/** Focuses the reel's pane `paneId` only where focus was lost (it left with the pane that
 *  held it), so focus the reader put somewhere else stays there. */
export const RestoreFocus = Command.define("RestoreFocus", {
  args: { reelId: Schema.String, paneId: Schema.String },
  messages: [Message.CompletedRestoreFocus],
  execute: ({ reelId, paneId }) =>
    Effect.gen(function* () {
      yield* Render.afterCommit;
      yield* Effect.sync(() => {
        const active = document.activeElement;

        if (active === null || active === document.body) {
          Option.map(paneElement(reelId, paneId), focusInto);
        }
      });

      return Message.CompletedRestoreFocus();
    }),
});

/** Scrolls the reel's pane or column `id` into view, by the least distance either way, its
 *  gutter kept by the stylesheet's `scroll-margin`, once the render that placed it is in the
 *  page. It jumps: motion is stepped or instant, and a follow is instant. */
export const ScrollIntoView = Command.define("ScrollIntoView", {
  args: {
    reelId: Schema.String,
    part: Schema.Literals(["pane", "column"]),
    id: Schema.String,
  },
  messages: [Message.CompletedScrollIntoView],
  execute: ({ reelId, part, id }) =>
    Effect.gen(function* () {
      yield* Render.afterCommit;
      yield* Effect.sync(() => {
        document
          .querySelector(partSelector(reelId, part, id))
          ?.scrollIntoView({ block: "nearest", inline: "nearest" });
      });

      return Message.CompletedScrollIntoView();
    }),
});

/** FocusPane for this reel's pane `paneId`. */
export const focusPane = (model: Model, paneId: string) =>
  FocusPane({ reelId: model.id, paneId });

/** ScrollIntoView for this reel's pane `paneId`. */
export const scrollToPane = (model: Model, paneId: string) =>
  ScrollIntoView({ reelId: model.id, part: "pane", id: paneId });
