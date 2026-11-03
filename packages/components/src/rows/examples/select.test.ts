import { Story } from "foldkit";
import { describe, expect, it } from "vite-plus/test";

import { Message, init, update } from "./select.ts";

describe("the select example", () => {
  it("selects and clears rows one by one", () => {
    Story.story(
      update,
      Story.given(init().model),
      Story.message(Message.ToggledItem({ id: "notes", isChecked: true })),
      Story.model((model) => {
        expect(model.selectedIds).toStrictEqual(["room", "notes"]);
      }),
      Story.message(Message.ToggledItem({ id: "room", isChecked: false })),
      Story.model((model) => {
        expect(model.selectedIds).toStrictEqual(["notes"]);
      })
    );
  });
});
