import { Button, Disclosure } from "@gjermundgaraba/components";
import { Schema } from "effect";
import type { Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";

export const Model = Schema.Struct({
  isGrantsOpen: Schema.Boolean,
  isDangerOpen: Schema.Boolean,
});

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  ToggledGrants: { isOpen: Schema.Boolean },
  ToggledDanger: { isOpen: Schema.Boolean },
});

export type Message = typeof Message.Type;

export const init = (): Update.Return<Model, Message> => ({
  model: { isGrantsOpen: true, isDangerOpen: false },
});

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    ToggledGrants: ({ isOpen }) => ({
      model: modifyFields(model, { isGrantsOpen: () => isOpen }),
    }),
    ToggledDanger: ({ isOpen }) => ({
      model: modifyFields(model, { isDangerOpen: () => isOpen }),
    }),
  });

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [],
    [
      Disclosure.view(
        {
          id: "disclosure-grants",
          label: "edit grants",
          isOpen: model.isGrantsOpen,
          onToggle: (isOpen) => Message.ToggledGrants({ isOpen }),
          body: [h.p([], ["Ada, Grace and Linus can edit this space."])],
        },
        h
      ),
      Disclosure.view(
        {
          id: "disclosure-danger",
          label: "danger zone",
          isOpen: model.isDangerOpen,
          onToggle: (isOpen) => Message.ToggledDanger({ isOpen }),
          body: [
            h.p([], ["Deleting the space removes every item in it."]),
            Button.view({ label: "delete space", glyph: "trash" }, h),
          ],
        },
        h
      ),
    ]
  );
