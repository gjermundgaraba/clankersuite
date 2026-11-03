import { FilterChip, FilterStrip, QueryChip } from "@gjermundgaraba/components";
import { Schema } from "effect";
import type { Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";

export const Model = Schema.Struct({
  isOpenOnly: Schema.Boolean,
  isDueSoon: Schema.Boolean,
  query: Schema.String,
});

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  ToggledOpenOnly: {},
  ToggledDueSoon: {},
  UpdatedQuery: { value: Schema.String },
  ClickedReset: {},
});

export type Message = typeof Message.Type;

export const init = (): Update.Return<Model, Message> => ({
  model: { isOpenOnly: true, isDueSoon: false, query: "" },
});

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    ToggledOpenOnly: () => ({
      model: modifyFields(model, { isOpenOnly: (isOn) => !isOn }),
    }),
    ToggledDueSoon: () => ({
      model: modifyFields(model, { isDueSoon: (isOn) => !isOn }),
    }),
    UpdatedQuery: ({ value }) => ({
      model: modifyFields(model, { query: () => value }),
    }),
    ClickedReset: () => ({
      model: { isOpenOnly: false, isDueSoon: false, query: "" },
    }),
  });

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  FilterStrip.view(
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
        FilterChip.view({ label: "mine", isPressed: true }, h),
        QueryChip.view(
          {
            id: "filter-strip-query",
            label: "find",
            value: model.query,
            onInput: (value) => Message.UpdatedQuery({ value }),
            placeholder: "words in a title",
          },
          h
        ),
        h.span([h.Class("gg-spacer")]),
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
