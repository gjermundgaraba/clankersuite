import { Clipboard } from "@effect/platform-browser";
import { CopyButton, LiveRegion, Secret } from "@gjermundgaraba/components";
import { Option, Schema } from "effect";
import { Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";

const API_KEY = "pk_sample_4f9a2c7e";

export const Model = Schema.Struct({ copyKey: CopyButton.Model });

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  GotCopyKeyMessage: { message: CopyButton.Message },
});

export type Message = typeof Message.Type;

export const init = (): Update.Return<Model, Message> => ({
  model: { copyKey: CopyButton.init({ id: "secret-api-key-copy" }) },
});

const foldCopyKey = Update.foldChild({
  update: CopyButton.update,
  read: (model: Model) => Option.some(model.copyKey),
  write: (model: Model, copyKey: CopyButton.Model): Model =>
    modifyFields(model, { copyKey: () => copyKey }),
  toParentMessage: (message: CopyButton.Message) =>
    Message.GotCopyKeyMessage({ message }),
});

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message, Clipboard.Clipboard>>(message, {
    GotCopyKeyMessage: ({ message: copyMessage }) =>
      foldCopyKey(model, copyMessage),
  });

export const resources = Clipboard.layer;

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [],
    [
      Secret.view(
        {
          value: API_KEY,
          label: "API key",
          actions: [
            h.submodel({
              slotId: CopyButton.id(model.copyKey),
              model: model.copyKey,
              view: CopyButton.view,
              viewInputs: { text: API_KEY, label: "Copy API key" },
              toParentMessage: (message) =>
                Message.GotCopyKeyMessage({ message }),
            }),
          ],
        },
        h
      ),
      ...LiveRegion.place([], () => LiveRegion.view({}, h)).toPageView(),
    ]
  );
