import { Focus, InlineInput } from "@gjermundgaraba/components";
import { Array, Option } from "effect";
import { Story } from "foldkit";
import { describe, expect, it } from "vite-plus/test";

import { ADD_BUTTON_ID, Message, SaveItem, init, update } from "./add.ts";
import type { Model } from "./add.ts";

const adding = (message: InlineInput.Message) =>
  Message.GotAddingMessage({ message });

const titles = (model: Model): readonly string[] =>
  Array.map(model.items, ({ title }) => title);

const startAdding = Story.steps(
  Story.message(Message.ClickedAdd()),
  Story.Command.resolve(
    InlineInput.FocusField,
    InlineInput.Message.CompletedFocusField()
  )
);

const enterItem = (text: string) =>
  Story.steps(
    Story.message(
      adding(InlineInput.Message.UpdatedDraft({ value: text, replaced: "" }))
    ),
    Story.message(adding(InlineInput.Message.PressedEnter())),
    Story.Command.expectExact(SaveItem({ text })),
    Story.Command.resolve(SaveItem, Message.CompletedSaveItem({ text }))
  );

const endAdding = Story.steps(
  Story.message(adding(InlineInput.Message.PressedEscape())),
  Story.Command.expectExact(Focus.Focus({ id: ADD_BUTTON_ID })),
  Story.Command.resolve(Focus.Focus, Message.CompletedFocus())
);

describe("the add example", () => {
  it("adds one item after another until Escape, then puts focus back on the button", () => {
    Story.story(
      update,
      Story.given(init().model),
      startAdding,
      enterItem("Water the plants"),
      enterItem("Call the plumber"),
      Story.model((model) => {
        expect(titles(model)).toStrictEqual([
          "Renew the certificate",
          "Water the plants",
          "Call the plumber",
        ]);
        expect(Array.map(model.items, ({ id }) => id)).toStrictEqual([
          "item-0",
          "item-1",
          "item-2",
        ]);
        expect(Option.isSome(model.maybeAdding)).toBe(true);
      }),
      endAdding,
      Story.model((model) => {
        expect(model.maybeAdding).toStrictEqual(Option.none());
      })
    );
  });

  it("refuses an item already on the list and keeps the field open with why", () => {
    Story.story(
      update,
      Story.given(init().model),
      startAdding,
      enterItem("renew the certificate"),
      Story.model((model) => {
        expect(titles(model)).toStrictEqual(["Renew the certificate"]);
        expect(
          Option.flatMap(model.maybeAdding, InlineInput.maybeError)
        ).toStrictEqual(
          Option.some("renew the certificate is already on the list.")
        );
      }),
      endAdding
    );
  });
});
