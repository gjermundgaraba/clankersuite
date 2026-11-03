import { Announcer, Focus, InlineInput } from "@gjermundgaraba/components";
import { Array, Option } from "effect";
import { Story } from "foldkit";
import { describe, expect, it } from "vite-plus/test";

import { Message, SaveRename, init, update } from "./cards.ts";
import type { Model } from "./cards.ts";

const resolveAnnounce = Story.Command.resolve(
  Announcer.Announce,
  Message.CompletedAnnounce()
);

const renaming = (message: InlineInput.Message) =>
  Message.GotRenameMessage({ message });

const renameTo = (text: string) =>
  Story.steps(
    Story.message(Message.ClickedRename({ taskId: "sink" })),
    Story.Command.resolve(
      InlineInput.FocusField,
      InlineInput.Message.CompletedFocusField()
    ),
    Story.message(
      renaming(
        InlineInput.Message.UpdatedDraft({
          value: text,
          replaced: "Fix the kitchen sink",
        })
      )
    ),
    Story.message(renaming(InlineInput.Message.PressedEnter())),
    Story.Command.expectExact(SaveRename({ taskId: "sink", text })),
    Story.Command.resolve(
      SaveRename,
      Message.CompletedSaveRename({ taskId: "sink", text })
    )
  );

const sinkTitle = (model: Model): Option.Option<string> =>
  Option.map(
    Array.findFirst(model.tasks, ({ id }) => id === "sink"),
    ({ title }) => title
  );

describe("the cards example", () => {
  it("says what opening a card and pressing its area do", () => {
    Story.story(
      update,
      Story.given(init().model),
      Story.message(Message.ClickedTask({ title: "Fix the kitchen sink" })),
      Story.Command.expectExact(
        Announcer.Announce({ text: "Opened Fix the kitchen sink." })
      ),
      resolveAnnounce,
      Story.message(Message.ClickedArea({ area: "Home" })),
      Story.Command.expectExact(Announcer.Announce({ text: "Showing Home." })),
      resolveAnnounce
    );
  });

  it("renames a card in place, then puts focus back on its pencil", () => {
    Story.story(
      update,
      Story.given(init().model),
      renameTo("Fix the bathroom sink"),
      Story.Command.expectExact(Focus.Focus({ id: "inbox-rename-sink" })),
      Story.Command.resolve(Focus.Focus, Message.CompletedFocus()),
      Story.model((model) => {
        expect(sinkTitle(model)).toStrictEqual(
          Option.some("Fix the bathroom sink")
        );
        expect(model.maybeRenaming).toStrictEqual(Option.none());
      })
    );
  });
});
