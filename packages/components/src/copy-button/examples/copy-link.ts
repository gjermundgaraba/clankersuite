import { Clipboard } from "@effect/platform-browser";
import { CopyButton, Group, LiveRegion } from "@gjermundgaraba/components";
import { Option, Schema } from "effect";
import { Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";

const LINK = "https://example.com/share/field-notes";

export const Model = Schema.Struct({ copyLink: CopyButton.Model });

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  GotCopyLinkMessage: { message: CopyButton.Message },
});

export type Message = typeof Message.Type;

export const init = (): Update.Return<Model, Message> => ({
  model: { copyLink: CopyButton.init({ id: "copy-link" }) },
});

const foldCopyLink = Update.foldChild({
  update: CopyButton.update,
  read: (model: Model) => Option.some(model.copyLink),
  write: (model: Model, copyLink: CopyButton.Model): Model =>
    modifyFields(model, { copyLink: () => copyLink }),
  toParentMessage: (message: CopyButton.Message) =>
    Message.GotCopyLinkMessage({ message }),
});

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message, Clipboard.Clipboard>>(message, {
    GotCopyLinkMessage: ({ message: copyMessage }) =>
      foldCopyLink(model, copyMessage),
  });

export const resources = Clipboard.layer;

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [],
    [
      Group.view(
        {
          body: [
            h.code([], [LINK]),
            h.submodel({
              slotId: CopyButton.id(model.copyLink),
              model: model.copyLink,
              view: CopyButton.view,
              viewInputs: { text: LINK, label: "Copy link" },
              toParentMessage: (message) =>
                Message.GotCopyLinkMessage({ message }),
            }),
          ],
        },
        h
      ),
      ...LiveRegion.place([], () => LiveRegion.view({}, h)).toPageView(),
    ]
  );
