import { Announcer } from "@gjermundgaraba/components";
import { Story } from "foldkit";
import { describe, expect, it } from "vite-plus/test";

import { Message, init, update } from "./announce.ts";

describe("the announce example", () => {
  it("takes the archived file off the list and says so", () => {
    Story.story(
      update,
      Story.given(init().model),
      Story.message(Message.ClickedArchive({ fileName: "budget.csv" })),
      Story.Command.expectExact(
        Announcer.Announce({ text: "Archived budget.csv." })
      ),
      Story.Command.resolve(Announcer.Announce, Message.CompletedAnnounce()),
      Story.model((model) => {
        expect(model.fileNames).toStrictEqual(["field-notes.md", "garden.md"]);
      })
    );
  });
});
