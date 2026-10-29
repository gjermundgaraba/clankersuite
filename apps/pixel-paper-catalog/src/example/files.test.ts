import { FileDrop as UiFileDrop } from "@foldkit/ui";
import { Announcer, DropZone } from "@gjermundgaraba/pixel-paper";
import { Option } from "effect";
import { Story } from "foldkit";
import { describe, expect, it } from "vite-plus/test";

import * as HeldWord from "../held-word.ts";
import * as FilesExample from "./files.ts";

const sample = new File(["a,b\n1,2\n"], "sample.csv", { type: "text/csv" });

const drop = (message: UiFileDrop.Message) =>
  FilesExample.Message.GotDropZoneMessage({
    message: DropZone.Message.GotFileDropMessage({ message }),
  });

const dropSample = drop(UiFileDrop.Message.DroppedFiles({ files: [sample] }));

describe("Files example", () => {
  it("prints how many files a drop brought, held as any flash word is", () => {
    Story.story(
      FilesExample.update,
      Story.given(FilesExample.init()),
      Story.message(dropSample),
      Story.model((model) => {
        expect(HeldWord.maybeWord(model.receivedWord)).toStrictEqual(
          Option.some("1 file received (sample)")
        );
      }),
      Story.Command.resolve(
        HeldWord.WaitBeforeClear,
        HeldWord.Message.CompletedWaitBeforeClear({ count: 1 })
      )
    );
  });

  it("says a drop with no files in it is refused", () => {
    Story.story(
      FilesExample.update,
      Story.given(FilesExample.init()),
      Story.message(drop(UiFileDrop.Message.DroppedNonFiles())),
      Story.Command.expectExact(
        Announcer.Announce({ text: "Only files can be dropped here." })
      ),
      Story.Command.resolve(
        Announcer.Announce,
        FilesExample.Message.CompletedAnnounce()
      )
    );
  });
});
