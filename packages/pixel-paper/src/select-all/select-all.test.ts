import { Checkbox as UiCheckbox } from "@foldkit/ui";
import { Schema } from "effect";
import { Scene } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";
import type * as Update from "foldkit/update";
import { describe, it } from "vite-plus/test";

import * as SelectAll from "./select-all.ts";

const Model = Schema.Struct({ total: Schema.Finite, selected: Schema.Finite });

type Model = typeof Model.Type;

const Message = defineMessageUnion({ ToggledAll: { isAll: Schema.Boolean } });

type Message = typeof Message.Type;

const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    ToggledAll: ({ isAll }) => ({
      model: modifyFields(model, { selected: () => (isAll ? model.total : 0) }),
    }),
  });

const view = (model: Model, h: HtmlBuilder<Message>) =>
  SelectAll.view(
    {
      id: "all",
      total: model.total,
      selected: model.selected,
      onToggle: (isAll) => Message.ToggledAll({ isAll }),
    },
    h
  );

const box = Scene.role("checkbox", { name: "Select all" });
const count = Scene.selector(`#${UiCheckbox.descriptionId("all")}`);

describe("SelectAll view", () => {
  it("names its box, describes it with the count, and marks it mixed", () => {
    Scene.scene(
      { update, view },
      Scene.given({ total: 12, selected: 3 }),
      Scene.expect(box).toHaveAttr("aria-checked", "mixed"),
      Scene.expect(box).toHaveAttr(
        "aria-describedby",
        UiCheckbox.descriptionId("all")
      ),
      Scene.expect(count).toHaveClass("bulk-count"),
      Scene.expect(count).toHaveText("3 of 12 selected")
    );
  });

  it("selects all from mixed, then none", () => {
    Scene.scene(
      { update, view },
      Scene.given({ total: 12, selected: 3 }),
      Scene.click(box),
      Scene.expect(box).toHaveAttr("aria-checked", "true"),
      Scene.expect(count).toHaveText("12 of 12 selected"),
      Scene.click(box),
      Scene.expect(box).toHaveAttr("aria-checked", "false"),
      Scene.expect(count).toHaveText("0 of 12 selected")
    );
  });

  it("is unavailable with nothing to select", () => {
    Scene.scene(
      { update, view },
      Scene.given({ total: 0, selected: 0 }),
      Scene.expect(box).toHaveAttr("aria-disabled", "true"),
      Scene.expect(box).toHaveAttr("aria-checked", "false")
    );
  });
});
