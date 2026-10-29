import { Option } from "effect";
import { Story } from "foldkit";
import { describe, expect, it } from "vite-plus/test";

import * as HeldWord from "./held-word.ts";

type PageMessage = HeldWord.Message | Readonly<{ _tag: "Saved" }>;

const update = (model: HeldWord.Model, message: PageMessage) =>
  message._tag === "Saved"
    ? HeldWord.show(model, "saved")
    : HeldWord.update(model, message);

const saved: PageMessage = { _tag: "Saved" };

const wordIs = (word: Option.Option<string>) =>
  Story.model((model: HeldWord.Model) => {
    expect(HeldWord.maybeWord(model)).toStrictEqual(word);
  });

describe("HeldWord", () => {
  it("prints the word and takes it back after the hold, so the next is printed afresh", () => {
    Story.story(
      update,
      Story.given(HeldWord.init()),
      Story.message(saved),
      Story.Command.expectExact(HeldWord.WaitBeforeClear({ count: 1 })),
      wordIs(Option.some("saved")),
      Story.Command.resolve(
        HeldWord.WaitBeforeClear,
        HeldWord.Message.CompletedWaitBeforeClear({ count: 1 })
      ),
      wordIs(Option.none())
    );
  });

  it("keeps a newer word when an older hold ends", () => {
    const savedTwice = HeldWord.show(
      HeldWord.show(HeldWord.init(), "saved").model,
      "saved"
    );

    Story.story(
      update,
      Story.given(savedTwice.model),
      Story.message(HeldWord.Message.CompletedWaitBeforeClear({ count: 1 })),
      wordIs(Option.some("saved"))
    );
  });
});
