import { Group, IconButton, Tips } from "@gjermundgaraba/components";
import { Option, Schema } from "effect";
import { Subscription, Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";

export const Model = Schema.Struct({ tips: Tips.Model });

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  GotTipsMessage: { message: Tips.Message },
});

export type Message = typeof Message.Type;

export const init = (): Update.Return<Model, Message> => ({
  model: { tips: Tips.init({ id: "tips-example-tip" }) },
});

const foldTips = Update.foldChild({
  update: Tips.update,
  read: (model: Model) => Option.some(model.tips),
  write: (model: Model, tips: Tips.Model): Model =>
    modifyFields(model, { tips: () => tips }),
  toParentMessage: (message: Tips.Message) =>
    Message.GotTipsMessage({ message }),
});

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    GotTipsMessage: ({ message: tipsMessage }) => foldTips(model, tipsMessage),
  });

export const subscriptions = Subscription.lift(Tips.subscriptions("tip"))<
  Model,
  Message
>({
  read: (model) => Option.some(model.tips),
  toParentMessage: (message) => Message.GotTipsMessage({ message }),
});

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [],
    [
      Group.view(
        {
          body: [
            IconButton.view({ glyph: "pencil", label: "Rename" }, h),
            IconButton.view({ glyph: "copy", label: "Copy link" }, h),
            IconButton.view(
              { glyph: "trash", label: "Delete", isQuiet: true },
              h
            ),
          ],
        },
        h
      ),
      h.submodel({
        slotId: Tips.id(model.tips),
        model: model.tips,
        view: Tips.view,
        toParentMessage: (message) => Message.GotTipsMessage({ message }),
      }),
    ]
  );
