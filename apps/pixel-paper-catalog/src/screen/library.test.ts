import { FileTree, Rail } from "@gjermundgaraba/pixel-paper";
import { Story } from "foldkit";
import { describe, expect, it } from "vite-plus/test";

import * as LibraryScreen from "./library.ts";

const openRail = LibraryScreen.Message.GotRailMessage({
  message: Rail.Message.ClickedOpen(),
});

const resolveShow = Story.Command.resolve(
  Rail.ShowRailDrawer,
  Rail.Message.CompletedShowRailDrawer()
);

const resolveHide = Story.Command.resolve(
  Rail.HideRailDrawer,
  Rail.Message.CompletedHideRailDrawer()
);

describe("Library screen", () => {
  it("selects a set and closes the drawer it was chosen in", () => {
    Story.story(
      LibraryScreen.update,
      Story.given(LibraryScreen.init()),
      Story.message(openRail),
      resolveShow,
      Story.message(LibraryScreen.Message.SelectedSet({ name: "notices" })),
      Story.Command.expectExact(Rail.HideRailDrawer),
      resolveHide,
      Story.model((model) => {
        expect(model.set).toBe("notices");
      })
    );
  });

  it("opens the file chosen in the tree and closes the drawer", () => {
    Story.story(
      LibraryScreen.update,
      Story.given(LibraryScreen.init()),
      Story.message(openRail),
      resolveShow,
      Story.message(
        LibraryScreen.Message.GotFileTreeMessage({
          message: FileTree.Message.ClickedFile({
            path: "hooks/before-deploy.sh",
          }),
        })
      ),
      Story.Command.expectExact(Rail.HideRailDrawer),
      resolveHide,
      Story.model((model) => {
        expect(model.openPath).toBe("hooks/before-deploy.sh");
      })
    );
  });

  it("selects a set with the rail in the page, where there is no drawer to close", () => {
    Story.story(
      LibraryScreen.update,
      Story.given(LibraryScreen.init()),
      Story.message(LibraryScreen.Message.SelectedSet({ name: "everything" })),
      Story.Command.expectNone(),
      Story.model((model) => {
        expect(model.set).toBe("everything");
      })
    );
  });

  it("keeps the rail hidden while its toggle has hidden it", () => {
    Story.story(
      LibraryScreen.update,
      Story.given(LibraryScreen.init()),
      Story.message(
        LibraryScreen.Message.GotRailMessage({
          message: Rail.Message.ClickedToggle(),
        })
      ),
      Story.Command.resolve(
        Rail.FocusRailToggle,
        Rail.Message.CompletedFocusRailToggle()
      ),
      Story.model((model) => {
        expect(model.isRailHidden).toBe(true);
      })
    );
  });
});
