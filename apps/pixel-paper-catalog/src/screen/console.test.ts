import { Dialog as UiDialog } from "@foldkit/ui";
import { Announcer, ConfirmDialog } from "@gjermundgaraba/pixel-paper";
import { Array, Option } from "effect";
import { Story } from "foldkit";
import { describe, expect, it } from "vite-plus/test";

import * as ConsoleScreen from "./console.ts";

const fresh = ConsoleScreen.init();

const confirm = (message: ConfirmDialog.Message) =>
  ConsoleScreen.Message.GotDropConfirmMessage({ message });

const clientNames = (model: ConsoleScreen.Model): readonly string[] =>
  Array.map(model.clients, ({ name }) => name);

const resolveShow = Story.Command.resolve(
  UiDialog.ShowDialog,
  UiDialog.Message.SucceededShowDialog()
);

const resolveClose = Story.Command.resolve(
  UiDialog.CloseDialog,
  UiDialog.Message.CompletedCloseDialog()
);

const resolveAnnounce = Story.Command.resolve(
  Announcer.Announce,
  ConsoleScreen.Message.CompletedAnnounce()
);

describe("Console screen", () => {
  it("asks before it deletes a client, then drops it, says so and closes the confirm", () => {
    Story.story(
      ConsoleScreen.update,
      Story.given(fresh),
      Story.message(ConsoleScreen.Message.ClickedDelete({ clientId: "c2" })),
      resolveShow,
      Story.model((model) => {
        expect(ConsoleScreen.isDialogOpen(model)).toBe(true);
        expect(clientNames(model)).toStrictEqual(clientNames(fresh));
      }),
      Story.message(confirm(ConfirmDialog.Message.ClickedConfirm())),
      Story.Command.expectExact(
        UiDialog.CloseDialog,
        Announcer.Announce({ text: "reporting deleted." })
      ),
      resolveClose,
      resolveAnnounce,
      Story.model((model) => {
        expect(ConsoleScreen.isDialogOpen(model)).toBe(false);
        expect(clientNames(model)).toStrictEqual([
          "build-runner",
          "desktop-app",
          "old-importer",
        ]);
        expect(model.maybeDropId).toStrictEqual(Option.none());
      })
    );
  });

  it("keeps the client when the confirm is cancelled", () => {
    Story.story(
      ConsoleScreen.update,
      Story.given(fresh),
      Story.message(ConsoleScreen.Message.ClickedDelete({ clientId: "c2" })),
      resolveShow,
      Story.message(confirm(ConfirmDialog.Message.ClickedCancel())),
      Story.Command.expectExact(UiDialog.CloseDialog),
      resolveClose,
      Story.model((model) => {
        expect(ConsoleScreen.isDialogOpen(model)).toBe(false);
        expect(clientNames(model)).toStrictEqual(clientNames(fresh));
        expect(model.maybeDropId).toStrictEqual(Option.none());
      })
    );
  });

  it("says whether the key was copied as it is dismissed", () => {
    Story.story(
      ConsoleScreen.update,
      Story.given(fresh),
      Story.message(ConsoleScreen.Message.ClickedStored()),
      Story.Command.expectExact(
        Announcer.Announce({ text: "Key dismissed without copying." })
      ),
      resolveAnnounce,
      Story.model((model) => {
        expect(model.isSecretShown).toBe(false);
      })
    );
    Story.story(
      ConsoleScreen.update,
      Story.given(ConsoleScreen.markSecretStored(fresh)),
      Story.message(ConsoleScreen.Message.ClickedStored()),
      Story.Command.expectExact(Announcer.Announce({ text: "Key dismissed." })),
      resolveAnnounce
    );
  });
});
