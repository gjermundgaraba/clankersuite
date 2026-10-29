import { EditableTitle, Focus, InlineInput } from "@gjermundgaraba/pixel-paper";
import { Array, Option } from "effect";
import { Story } from "foldkit";
import { describe, expect, it } from "vite-plus/test";

import * as InlineExample from "./inline.ts";

const adding = (message: InlineInput.Message) =>
  InlineExample.Message.GotAddingMessage({ message });

const heading = (message: InlineInput.Message) =>
  InlineExample.Message.GotHeadingMessage({
    message: EditableTitle.Message.GotEditMessage({ message }),
  });

const titles = (model: InlineExample.Model): readonly string[] =>
  Array.map(model.items, ({ title }) => title);

const startAdding = Story.steps(
  Story.message(InlineExample.Message.ClickedAdd()),
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
    Story.Command.expectExact(InlineExample.SaveItem({ text })),
    Story.Command.resolve(
      InlineExample.SaveItem,
      InlineExample.Message.CompletedSaveItem({ text })
    )
  );

const endAdding = Story.steps(
  Story.message(adding(InlineInput.Message.PressedEscape())),
  Story.Command.expectExact(Focus.Focus({ id: "inline-add-button" })),
  Story.Command.resolve(Focus.Focus, InlineExample.Message.CompletedFocus())
);

describe("Inline example", () => {
  it("adds one item after another until Escape, then puts focus back on the button", () => {
    Story.story(
      InlineExample.update,
      Story.given(InlineExample.init()),
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
      InlineExample.update,
      Story.given(InlineExample.init()),
      startAdding,
      enterItem("renew the certificate"),
      Story.model((model) => {
        expect(titles(model)).toStrictEqual(["Renew the certificate"]);
        expect(
          Option.flatMap(model.maybeAdding, InlineInput.maybeError)
        ).toStrictEqual(
          Option.some("renew the certificate is already on the list (sample).")
        );
      }),
      endAdding
    );
  });

  it("renames the title, refusing one that is too long", () => {
    const tooLong = "A title far longer than forty letters, for the sample";
    Story.story(
      InlineExample.update,
      Story.given(InlineExample.init()),
      Story.message(
        InlineExample.Message.GotHeadingMessage({
          message: EditableTitle.Message.ClickedTitle(),
        })
      ),
      Story.Command.resolve(
        InlineInput.FocusField,
        InlineInput.Message.CompletedFocusField()
      ),
      Story.message(
        heading(
          InlineInput.Message.UpdatedDraft({
            value: tooLong,
            replaced: "Field notes",
          })
        )
      ),
      Story.message(heading(InlineInput.Message.PressedEnter())),
      Story.Command.resolve(
        InlineExample.SaveHeading,
        InlineExample.Message.CompletedSaveHeading({ text: tooLong })
      ),
      Story.model((model) => {
        expect(model.headingText).toBe("Field notes");
      }),
      Story.message(
        heading(
          InlineInput.Message.UpdatedDraft({
            value: "Garden notes",
            replaced: "Field notes",
          })
        )
      ),
      Story.message(heading(InlineInput.Message.PressedEnter())),
      Story.Command.resolve(
        InlineExample.SaveHeading,
        InlineExample.Message.CompletedSaveHeading({ text: "Garden notes" })
      ),
      Story.Command.resolve(
        Focus.Focus,
        EditableTitle.Message.CompletedFocus()
      ),
      Story.model((model) => {
        expect(model.headingText).toBe("Garden notes");
      })
    );
  });
});
