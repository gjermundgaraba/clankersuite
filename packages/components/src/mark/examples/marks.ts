import { Mark, Wrap } from "@gjermundgaraba/components";
import { Schema } from "effect";
import type { Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";

export const Model = Schema.Struct({ isFlagged: Schema.Boolean });

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({ ToggledFlag: {} });

export type Message = typeof Message.Type;

export const init = (): Update.Return<Model, Message> => ({
  model: { isFlagged: false },
});

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    ToggledFlag: () => ({ model: { isFlagged: !model.isFlagged } }),
  });

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  Wrap.view(
    {
      body: [
        Mark.view({ label: "Needs attention" }, h),
        Mark.view({ label: "Marked", isPlain: true }, h),
        Mark.view(
          {
            label: "Flag",
            isPressed: model.isFlagged,
            onToggle: Message.ToggledFlag(),
          },
          h
        ),
      ],
    },
    h
  );
