import { Story } from "foldkit";
import { describe, expect, it } from "vite-plus/test";

import { Message, init, update } from "./strip.ts";

describe("the strip example", () => {
  it("toggles each filter both ways, takes a query, and resets them all", () => {
    Story.story(
      update,
      Story.given(init().model),
      Story.message(Message.ToggledOpenOnly()),
      Story.message(Message.ToggledDueSoon()),
      Story.message(Message.UpdatedQuery({ value: "plumber" })),
      Story.model((model) => {
        expect(model).toStrictEqual({
          isOpenOnly: false,
          isDueSoon: true,
          query: "plumber",
        });
      }),
      Story.message(Message.ToggledOpenOnly()),
      Story.message(Message.ToggledDueSoon()),
      Story.model((model) => {
        expect(model).toStrictEqual({
          isOpenOnly: true,
          isDueSoon: false,
          query: "plumber",
        });
      }),
      Story.message(Message.ToggledDueSoon()),
      Story.model((model) => {
        expect(model).toStrictEqual({
          isOpenOnly: true,
          isDueSoon: true,
          query: "plumber",
        });
      }),
      Story.message(Message.ClickedReset()),
      Story.model((model) => {
        expect(model).toStrictEqual({
          isOpenOnly: false,
          isDueSoon: false,
          query: "",
        });
      })
    );
  });
});
