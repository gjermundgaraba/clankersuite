import { FileDrop as UiFileDrop } from "@foldkit/ui";
import { Announcer, DropZone } from "@gjermundgaraba/components";
import { Option } from "effect";
import { Story } from "foldkit";
import { describe, expect, it } from "vite-plus/test";

import { Message, WaitBeforeClear, init, update } from "./upload.ts";

const sample = new File(["a,b\n1,2\n"], "sample.csv", { type: "text/csv" });

const drop = (message: UiFileDrop.Message) =>
  Message.GotDropZoneMessage({
    message: DropZone.Message.GotFileDropMessage({ message }),
  });

describe("the upload example", () => {
  it("prints how many files a drop brought, then takes the word back", () => {
    Story.story(
      update,
      Story.given(init().model),
      Story.message(drop(UiFileDrop.Message.DroppedFiles({ files: [sample] }))),
      Story.model((model) => {
        expect(model.maybeReceivedWord).toStrictEqual(
          Option.some("1 file received")
        );
      }),
      Story.Command.expectExact(WaitBeforeClear({ count: 1 })),
      Story.Command.resolve(
        WaitBeforeClear,
        Message.CompletedWaitBeforeClear({ count: 1 })
      ),
      Story.model((model) => {
        expect(model.maybeReceivedWord).toStrictEqual(Option.none());
      })
    );
  });

  it("says a drop with no files in it is refused", () => {
    Story.story(
      update,
      Story.given(init().model),
      Story.message(drop(UiFileDrop.Message.DroppedNonFiles())),
      Story.Command.expectExact(
        Announcer.Announce({ text: "Only files can be dropped here." })
      ),
      Story.Command.resolve(Announcer.Announce, Message.CompletedAnnounce())
    );
  });
});
