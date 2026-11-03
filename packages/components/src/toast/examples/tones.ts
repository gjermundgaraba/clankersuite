import { Button, LiveRegion, Toast, Wrap } from "@gjermundgaraba/components";
import { Option, Schema } from "effect";
import { Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";

export const Model = Schema.Struct({ toasts: Toast.Model });

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  ClickedArchive: {},
  ClickedSync: {},
  ClickedSave: {},
  GotToastsMessage: { message: Toast.Message },
});

export type Message = typeof Message.Type;

export const init = (): Update.Return<Model, Message> => ({
  model: { toasts: Toast.init({ id: "toasts-example" }) },
});

const toastsFold = {
  read: (model: Model) => Option.some(model.toasts),
  write: (model: Model, toasts: Toast.Model): Model =>
    modifyFields(model, { toasts: () => toasts }),
  toParentMessage: (message: Toast.Message) =>
    Message.GotToastsMessage({ message }),
};

const showToast = Update.foldChild({ update: Toast.show, ...toastsFold });

const foldToasts = Update.foldChild({ update: Toast.update, ...toastsFold });

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    ClickedArchive: () =>
      showToast(model, {
        tone: "Ok",
        title: "Moved to archive",
        body: "field-notes.md",
      }),
    ClickedSync: () =>
      showToast(model, {
        tone: "Quiet",
        title: "Synced",
        body: "3 changes from your phone.",
      }),
    ClickedSave: () =>
      showToast(model, {
        tone: "Error",
        title: "Could not save",
        body: "The connection dropped. Try again once you are back online.",
      }),
    GotToastsMessage: ({ message: toastsMessage }) =>
      foldToasts(model, toastsMessage),
  });

export const view = (model: Model, h: HtmlBuilder<Message>): Html => {
  const liveRegion = LiveRegion.place([], () =>
    LiveRegion.view(
      {
        toasts: h.submodel({
          slotId: Toast.id(model.toasts),
          model: model.toasts,
          view: Toast.view,
          toParentMessage: (message) => Message.GotToastsMessage({ message }),
        }),
      },
      h
    )
  );

  return h.div(
    [],
    [
      Wrap.view(
        {
          body: [
            Button.view(
              {
                label: "archive",
                glyph: "box",
                onClick: Message.ClickedArchive(),
              },
              h
            ),
            Button.view(
              { label: "sync", glyph: "sync", onClick: Message.ClickedSync() },
              h
            ),
            Button.view(
              { label: "save", glyph: "save", onClick: Message.ClickedSave() },
              h
            ),
          ],
        },
        h
      ),
      ...liveRegion.toPageView(),
    ]
  );
};
