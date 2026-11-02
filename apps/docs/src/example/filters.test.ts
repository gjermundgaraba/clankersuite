import { Story } from "foldkit";
import { describe, expect, it } from "vite-plus/test";

import * as FiltersExample from "./filters.ts";

describe("Filters example", () => {
  it("toggles each filter both ways, takes a query, and resets the filters but not the flag", () => {
    Story.story(
      FiltersExample.update,
      Story.given(FiltersExample.init()),
      Story.message(FiltersExample.Message.ToggledOpenOnly()),
      Story.message(FiltersExample.Message.ToggledDueSoon()),
      Story.message(FiltersExample.Message.ToggledFlag()),
      Story.message(FiltersExample.Message.UpdatedQuery({ value: "plumber" })),
      Story.model((model) => {
        expect(model).toStrictEqual({
          isOpenOnly: false,
          isDueSoon: true,
          query: "plumber",
          isFlagged: true,
        });
      }),
      Story.message(FiltersExample.Message.ToggledOpenOnly()),
      Story.message(FiltersExample.Message.ToggledDueSoon()),
      Story.model((model) => {
        expect(model).toStrictEqual({
          isOpenOnly: true,
          isDueSoon: false,
          query: "plumber",
          isFlagged: true,
        });
      }),
      Story.message(FiltersExample.Message.ToggledDueSoon()),
      Story.model((model) => {
        expect(model).toStrictEqual({
          isOpenOnly: true,
          isDueSoon: true,
          query: "plumber",
          isFlagged: true,
        });
      }),
      Story.message(FiltersExample.Message.ClickedReset()),
      Story.model((model) => {
        expect(model).toStrictEqual({
          isOpenOnly: false,
          isDueSoon: false,
          query: "",
          isFlagged: true,
        });
      }),
      Story.message(FiltersExample.Message.ToggledFlag()),
      Story.model((model) => {
        expect(model.isFlagged).toBe(false);
      })
    );
  });
});
