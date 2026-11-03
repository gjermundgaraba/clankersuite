import { Option } from "effect";
import { Story } from "foldkit";
import { describe, expect, it } from "vite-plus/test";

import { Message, WaitBeforeClearFlashWord, init, update } from "./saved.ts";
import type { Model } from "./saved.ts";

const wordIs = (maybeWord: Option.Option<string>) =>
  Story.model((model: Model) => {
    expect(model.maybeSavedWord).toStrictEqual(maybeWord);
  });

describe("the saved example", () => {
  it("prints the word and takes it back after the hold, so the next is printed afresh", () => {
    Story.story(
      update,
      Story.given(init().model),
      Story.message(Message.ClickedSave()),
      Story.Command.expectExact(WaitBeforeClearFlashWord({ count: 1 })),
      wordIs(Option.some("saved")),
      Story.Command.resolve(
        WaitBeforeClearFlashWord,
        Message.CompletedWaitBeforeClearFlashWord({ count: 1 })
      ),
      wordIs(Option.none())
    );
  });

  it("keeps a newer word when an older hold ends", () => {
    const savedTwice = update(
      update(init().model, Message.ClickedSave()).model,
      Message.ClickedSave()
    );

    Story.story(
      update,
      Story.given(savedTwice.model),
      Story.message(Message.CompletedWaitBeforeClearFlashWord({ count: 1 })),
      wordIs(Option.some("saved"))
    );
  });
});
