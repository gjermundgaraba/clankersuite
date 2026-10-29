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

describe("Toasts example", () => {
  it("raises a slip for the archived file and says it once", () => {
    Story.story(
      ToastsExample.update,
      Story.given(ToastsExample.init()),
      Story.message(ToastsExample.Message.ClickedArchive()),
      Story.model((model) => {
        expect(showing(model)).toStrictEqual(["Moved to archive"]);
      }),
      Story.Command.expectHas(
        Toast.AnnounceSlip({
          stackId: "page-toasts",
          text: "Moved to archive. field-notes.md (sample)",
        })
      ),
      resolveAnnounceSlip,
      UiToast.test.drainEntry({ entryId: "page-toasts-entry-0" }),
      Story.model((model) => {
        expect(showing(model)).toStrictEqual([]);
      })
    );
  });
});
