import { FilterChip, Group } from "@gjermundgaraba/components";
import { Schema } from "effect";
import type { Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";

export const Model = Schema.Struct({
  isOpenOnly: Schema.Boolean,
  isDueSoon: Schema.Boolean,
});

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  ToggledOpenOnly: {},
  ToggledDueSoon: {},
  ClickedReset: {},
});

export type Message = typeof Message.Type;

export const init = (): Update.Return<Model, Message> => ({
  model: { isOpenOnly: true, isDueSoon: false },
});

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    ToggledOpenOnly: () => ({
      model: modifyFields(model, { isOpenOnly: (isOn) => !isOn }),
    }),
    ToggledDueSoon: () => ({
      model: modifyFields(model, { isDueSoon: (isOn) => !isOn }),
    }),
    ClickedReset: () => ({ model: { isOpenOnly: false, isDueSoon: false } }),
  });

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  Group.view(
    {
      body: [
        FilterChip.view(
          {
            label: "open",
            isPressed: model.isOpenOnly,
            onToggle: Message.ToggledOpenOnly(),
          },
          h
        ),
        FilterChip.view(
          {
            label: "this week",
            isPressed: model.isDueSoon,
            onToggle: Message.ToggledDueSoon(),
          },
          h
        ),
        FilterChip.view(
          {
            label: "reset",
            full: "Reset the filters",
            isReset: true,
            onToggle: Message.ClickedReset(),
          },
          h
        ),
      ],
    },
    h
  );
