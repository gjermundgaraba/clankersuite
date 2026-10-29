import { Rail } from "@gjermundgaraba/pixel-paper";
import { Story } from "foldkit";
import { describe, expect, it } from "vite-plus/test";

import * as RailExample from "./rail.ts";

describe("Rail example", () => {
  it("shows the collection picked in the drawer, and closes the drawer", () => {
    Story.story(
      RailExample.update,
      Story.given(RailExample.init()),
      Story.message(
        RailExample.Message.GotRailMessage({
          message: Rail.Message.ClickedOpen(),
        })
      ),
      Story.Command.resolve(
        Rail.ShowRailDrawer,
        Rail.Message.CompletedShowRailDrawer()
      ),
      Story.message(
        RailExample.Message.SelectedCollection({ collection: "Reading" })
      ),
      Story.Command.expectExact(Rail.HideRailDrawer),
      Story.Command.resolve(
        Rail.HideRailDrawer,
        Rail.Message.CompletedHideRailDrawer()
      ),
      Story.model((model) => {
        expect(model.collection).toBe("Reading");
        expect(Rail.isOpen(model.rail)).toBe(false);
      })
    );
  });

  it("keeps the rail hidden when its toggle asks, and shown when it asks again", () => {
    const resolveFocus = Story.Command.resolve(
      Rail.FocusRailToggle,
      Rail.Message.CompletedFocusRailToggle()
    );

    Story.story(
      RailExample.update,
      Story.given(RailExample.init()),
      Story.message(
        RailExample.Message.GotRailMessage({
          message: Rail.Message.ClickedToggle(),
        })
      ),
      resolveFocus,
      Story.model((model) => {
        expect(model.isRailHidden).toBe(true);
      }),
      Story.message(
        RailExample.Message.GotRailMessage({
          message: Rail.Message.ClickedToggle(),
        })
      ),
      resolveFocus,
      Story.model((model) => {
        expect(model.isRailHidden).toBe(false);
      })
    );
  });
});
