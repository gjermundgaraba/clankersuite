import { Toast as UiToast } from "@foldkit/ui";
import { Toast } from "@gjermundgaraba/components";
import { Array } from "effect";
import { Story } from "foldkit";
import { describe, expect, it } from "vite-plus/test";

import { Message, init, update } from "./tones.ts";
import type { Model } from "./tones.ts";

const showing = (model: Model): readonly string[] =>
  Array.map(
    Array.filter(
      model.toasts.stack.entries,
      (entry) => entry.animation.isShowing
    ),
    (entry) => entry.payload.title
  );

describe("the toasts example", () => {
  it("raises a slip for the archived file, says it once, and lets it go after the hold", () => {
    Story.story(
      update,
      Story.given(init().model),
      Story.message(Message.ClickedArchive()),
      Story.model((model) => {
        expect(showing(model)).toStrictEqual(["Moved to archive"]);
      }),
      Story.Command.expectHas(
        Toast.AnnounceSlip({
          stackId: "toasts-example",
          text: "Moved to archive. field-notes.md",
        })
      ),
      Story.Command.resolve(
        Toast.AnnounceSlip,
        Toast.Message.CompletedAnnounceSlip()
      ),
      UiToast.test.drainEntry({ entryId: "toasts-example-entry-0" }),
      Story.model((model) => {
        expect(showing(model)).toStrictEqual([]);
      })
    );
  });
});
