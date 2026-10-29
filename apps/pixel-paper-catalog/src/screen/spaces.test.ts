import { Announcer } from "@gjermundgaraba/pixel-paper";
import { Story } from "foldkit";
import { describe, expect, it } from "vite-plus/test";

import * as SpacesScreen from "./spaces.ts";

describe("Spaces screen", () => {
  it("says that a new space is a sample and makes none", () => {
    Story.story(
      SpacesScreen.update,
      Story.given(SpacesScreen.init()),
      Story.message(SpacesScreen.Message.ClickedNewSpace()),
      Story.Command.expectExact(
        Announcer.Announce({ text: "Sample: no space was made." })
      ),
      Story.Command.resolve(
        Announcer.Announce,
        SpacesScreen.Message.CompletedAnnounce()
      ),
      Story.model((model) => {
        expect(model).toStrictEqual(SpacesScreen.init());
      })
    );
  });
});
