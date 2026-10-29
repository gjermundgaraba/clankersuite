import { Announcer } from "@gjermundgaraba/pixel-paper";
import { Story } from "foldkit";
import { describe, it } from "vite-plus/test";

import * as FramesExample from "./frames.ts";

describe("Frames example", () => {
  it("says the banner's state once, when it begins on retry", () => {
    Story.story(
      FramesExample.update,
      Story.given(FramesExample.init()),
      Story.message(FramesExample.Message.ClickedRetry()),
      Story.Command.expectExact(
        Announcer.Announce({
          text: "Reconnecting. Your changes wait here until the link is back.",
        })
      ),
      Story.Command.resolve(
        Announcer.Announce,
        FramesExample.Message.CompletedAnnounce()
      )
    );
  });

  it("says a reload happened, since the sample has no page to load", () => {
    Story.story(
      FramesExample.update,
      Story.given(FramesExample.init()),
      Story.message(FramesExample.Message.ClickedReload()),
      Story.Command.expectExact(
        Announcer.Announce({ text: "Reloaded the sample page." })
      ),
      Story.Command.resolve(
        Announcer.Announce,
        FramesExample.Message.CompletedAnnounce()
      )
    );
  });
});
