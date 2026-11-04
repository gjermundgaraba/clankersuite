import {
  Button,
  Card,
  Dialog,
  LiveRegion,
  Toast,
  Wrap,
} from "@gjermundgaraba/components";
import { Option, Schema } from "effect";
import { Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";

export const Model = Schema.Struct({
  settings: Dialog.Model,
  toasts: Toast.Model,
});

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  ClickedSync: {},
  ClickedOpenSettings: {},
  ClickedSaveSettings: {},
  GotSettingsMessage: { message: Dialog.Message },
  GotToastsMessage: { message: Toast.Message },
});

export type Message = typeof Message.Type;

export const init = (): Update.Return<Model, Message> => ({
  model: {
    settings: Dialog.init({ id: "live-region-settings" }),
    toasts: Toast.init({ id: "live-region-toasts" }),
  },
});

const settingsFold = Dialog.foldDialog(Dialog, {
  read: (model: Model) => model.settings,
  write: (model: Model, settings: Dialog.Model): Model =>
    modifyFields(model, { settings: () => settings }),
  toParentMessage: (message: Dialog.Message): Message =>
    Message.GotSettingsMessage({ message }),
});

const toastsFold = {
  read: (model: Model) => Option.some(model.toasts),
  write: (model: Model, toasts: Toast.Model): Model =>
    modifyFields(model, { toasts: () => toasts }),
  toParentMessage: (message: Toast.Message): Message =>
    Message.GotToastsMessage({ message }),
};

const show = Update.foldChild({ update: Toast.show, ...toastsFold });

const foldToasts = Update.foldChild({ update: Toast.update, ...toastsFold });

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    ClickedSync: () =>
      show(model, {
        tone: "Quiet",
        title: "Synced",
        body: "3 changes from your phone.",
      }),
    ClickedOpenSettings: () => settingsFold.open(model),
    ClickedSaveSettings: () =>
      show(model, { tone: "Ok", title: "Saved", body: "Digest at 08:00." }),
    GotSettingsMessage: ({ message: settingsMessage }) =>
      settingsFold.update(model, settingsMessage),
    GotToastsMessage: ({ message: toastsMessage }) =>
      foldToasts(model, toastsMessage),
  });

const settingsCardView = (
  render: Dialog.RenderInfo,
  h: HtmlBuilder<Message>
): Html =>
  Card.view(
    {
      title: "Settings",
      titleAttributes: render.title,
      closeAttributes: render.closeButton,
      actionBarAttributes: render.actionBar,
      isNarrow: true,
      body: ["The toasts render in here while the dialog is open."],
      actions: [
        Button.view({ label: "close", attributes: render.closeButton }, h),
        Button.view(
          {
            label: "save",
            variant: "Primary",
            isDefault: true,
            onClick: Message.ClickedSaveSettings(),
            attributes: render.initialFocus,
          },
          h
        ),
      ],
    },
    h
  );

export const view = (model: Model, h: HtmlBuilder<Message>): Html => {
  const liveParts = LiveRegion.place(
    [["Settings", Dialog.isOpen(model.settings)]],
    () =>
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
              { label: "sync", glyph: "sync", onClick: Message.ClickedSync() },
              h
            ),
            Button.view(
              {
                label: "settings",
                glyph: "settings",
                onClick: Message.ClickedOpenSettings(),
              },
              h
            ),
          ],
        },
        h
      ),
      h.submodel({
        slotId: Dialog.id(model.settings),
        model: model.settings,
        view: Dialog.view,
        viewInputs: {
          toView: (render) => settingsCardView(render, h),
          toLiveRegionView: liveParts.toDialogView("Settings"),
        },
        toParentMessage: (message) => Message.GotSettingsMessage({ message }),
      }),
      ...liveParts.toPageView(),
    ]
  );
};
