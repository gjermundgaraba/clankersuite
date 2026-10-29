import { Toast as UiToast } from "@foldkit/ui";
import { Toast } from "@gjermundgaraba/pixel-paper";
import { Array } from "effect";
import { Story } from "foldkit";
import { describe, expect, it } from "vite-plus/test";

import * as ToastsExample from "./toasts.ts";

const resolveAnnounceSlip = Story.Command.resolve(
  Toast.AnnounceSlip,
  Toast.Message.CompletedAnnounceSlip()
);

const showing = (model: ToastsExample.Model): readonly string[] =>
  Array.map(
    Array.filter(
      model.toasts.stack.entries,
      (entry) => entry.animation.isShowing
    ),
    (entry) => entry.payload.title
  );

const archived = ToastsExample.update(
  ToastsExample.init(),
  ToastsExample.Message.ClickedArchive()
).model;

describe("Toasts example", () => {
  it("puts the archived file back when the slip's undo is pressed", () => {
    Story.story(
      ToastsExample.update,
      Story.given(archived),
      Story.message(
        ToastsExample.Message.GotToastsMessage({
          message: Toast.Message.ClickedAction({
            entryId: "page-toasts-entry-0",
            action: { id: "undo", label: "undo" },
          }),
        })
      ),
      Story.model((model) => {
        expect(showing(model)).toStrictEqual(["Put back"]);
      }),
      Story.Command.expectHas(
        Toast.AnnounceSlip({
          stackId: "page-toasts",
          text: "Put back. field-notes.md is where it was (sample).",
        })
      ),
      resolveAnnounceSlip,
      UiToast.test.drainEntry({ entryId: "page-toasts-entry-1" }),
      UiToast.test.drainEntry({ entryId: "page-toasts-entry-0" }),
      Story.model((model) => {
        expect(showing(model)).toStrictEqual([]);
      })
    );
  });
});
