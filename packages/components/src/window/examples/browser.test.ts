import { Announcer } from "@gjermundgaraba/components";
import { Story } from "foldkit";
import { describe, it } from "vite-plus/test";

import { Message, update } from "./browser.ts";

describe("the browser example", () => {
  it("says a reload happened, since there is no page to load", () => {
    Story.story(
      update,
      Story.given({ address: "https://example.com/" }),
      Story.message(Message.ClickedReload()),
      Story.Command.expectExact(
        Announcer.Announce({ text: "Reloaded https://example.com/" })
      ),
      Story.Command.resolve(Announcer.Announce, Message.CompletedAnnounce())
    );
  });
});
