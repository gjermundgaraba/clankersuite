import type { KeyHint } from "@gjermundgaraba/pixel-paper";
import { Option, Schema } from "effect";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";
import * as Update from "foldkit/update";

import * as InlineExample from "../example/inline.ts";
import * as MenusExample from "../example/menus.ts";
import * as PaletteExample from "../example/palette.ts";
import * as ToastsExample from "../example/toasts.ts";
import type { SectionsById } from "../page/components.ts";

export const Model = Schema.Struct({
  menus: MenusExample.Model,
  palette: PaletteExample.Model,
  inline: InlineExample.Model,
  toasts: ToastsExample.Model,
});

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  GotMenusMessage: { message: MenusExample.Message },
  GotPaletteMessage: { message: PaletteExample.Message },
  GotInlineMessage: { message: InlineExample.Message },
  GotToastsMessage: { message: ToastsExample.Message },
});

export type Message = typeof Message.Type;

export const init = (): Model => ({
  menus: MenusExample.init(),
  palette: PaletteExample.init(),
  inline: InlineExample.init(),
  toasts: ToastsExample.init(),
});

const toastsFold = {
  read: (model: Model) => Option.some(model.toasts),
  write: (model: Model, nextToasts: ToastsExample.Model): Model =>
    modifyFields(model, { toasts: () => nextToasts }),
  toParentMessage: (message: ToastsExample.Message) =>
    Message.GotToastsMessage({ message }),
};

const foldToasts = Update.foldChild({
  update: ToastsExample.update,
  ...toastsFold,
});

const foldToastsShow = Update.foldChild({
  update: ToastsExample.show,
  ...toastsFold,
});

const foldMenus = Update.foldChild({
  update: MenusExample.update,
  read: (model: Model) => Option.some(model.menus),
  write: (model: Model, nextMenus: MenusExample.Model): Model =>
    modifyFields(model, { menus: () => nextMenus }),
  toParentMessage: (message) => Message.GotMenusMessage({ message }),
});

const foldPalette = Update.foldChild({
  update: PaletteExample.update,
  read: (model: Model) => Option.some(model.palette),
  write: (model: Model, nextPalette: PaletteExample.Model): Model =>
    modifyFields(model, { palette: () => nextPalette }),
  toParentMessage: (message) => Message.GotPaletteMessage({ message }),
  foldOutMessage: PaletteExample.OutMessage.match<Update.Step<Model, Message>>({
    RefusedPick:
      ({ reason }) =>
      (model) =>
        foldToastsShow(model, {
          tone: "Error",
          title: "Not moved",
          body: reason,
        }),
  }),
});

const foldInline = Update.foldChild({
  update: InlineExample.update,
  read: (model: Model) => Option.some(model.inline),
  write: (model: Model, nextInline: InlineExample.Model): Model =>
    modifyFields(model, { inline: () => nextInline }),
  toParentMessage: (message) => Message.GotInlineMessage({ message }),
});

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    GotMenusMessage: ({ message: menusMessage }) =>
      foldMenus(model, menusMessage),
    GotPaletteMessage: ({ message: paletteMessage }) =>
      foldPalette(model, paletteMessage),
    GotInlineMessage: ({ message: inlineMessage }) =>
      foldInline(model, inlineMessage),
    GotToastsMessage: ({ message: toastsMessage }) =>
      foldToasts(model, toastsMessage),
  });

export const isDialogOpen = (model: Model): boolean =>
  PaletteExample.isDialogOpen(model.palette);

export const toastsView = <ParentMessage>(
  model: Model,
  toParentMessage: (message: Message) => ParentMessage,
  h: HtmlBuilder<ParentMessage>
): Html =>
  ToastsExample.stackView(
    model.toasts,
    (message) => toParentMessage(Message.GotToastsMessage({ message })),
    h
  );

export const sections = <ParentMessage>(
  model: Model,
  platform: KeyHint.KeyPlatform,
  toLiveRegionView: (() => Html) | undefined,
  toParentMessage: (message: Message) => ParentMessage,
  h: HtmlBuilder<ParentMessage>
) =>
  ({
    menus: {
      title: "Menus",
      file: "menus.ts",
      about:
        "A printed slip under its toggle. Its rows take focus: the arrows move and wrap, stopping on rows that cannot run so their reason is read; Enter or a click picks one and the slip closes, except a check, which toggles in place. Radio rows say which is checked and print it inverted. A right click, or the context menu key, opens the same items for the row it was on.",
      body: () =>
        h.submodel({
          slotId: "menus-example",
          model: model.menus,
          view: MenusExample.view,
          viewInputs: { platform },
          toParentMessage: (message) =>
            toParentMessage(Message.GotMenusMessage({ message })),
        }),
    },
    "command-palette": {
      title: "Command palette",
      file: "palette.ts",
      about:
        "Type to find a command; ↑ and ↓ move the one cursor row and stop at the ends, Enter runs it. A command with a page opens it in place: Back or Backspace in an empty field returns to the commands as they were. A picked choice holds the page while it applies; Archive refuses: a Notice in the palette says why, and a toast says so above it.",
      body: () =>
        h.submodel({
          slotId: "palette-example",
          model: model.palette,
          view: PaletteExample.view,
          viewInputs: { platform, toLiveRegionView },
          toParentMessage: (message) =>
            toParentMessage(Message.GotPaletteMessage({ message })),
        }),
    },
    inline: {
      title: "Inline editing",
      file: "inline.ts",
      about:
        "A field in place of the text it edits. Enter or leaving saves, Escape discards; while the save is out the field is held. Adding repeats: each Enter saves and opens the next, until Escape.",
      body: () =>
        h.submodel({
          slotId: "inline-example",
          model: model.inline,
          view: InlineExample.view,
          toParentMessage: (message) =>
            toParentMessage(Message.GotInlineMessage({ message })),
        }),
    },
    toasts: {
      title: "Toasts",
      file: "toasts.ts",
      about:
        "Printed slips at the bottom right, said politely. Ok and quiet ones leave after the hold, which waits for the whole stack while the pointer or the keyboard is on it; an error stays until dismissed, and Escape takes the newest. While a dialog is open the stack prints inside it, so it stays above the veil and is heard.",
      body: () =>
        h.submodel({
          slotId: "toasts-example",
          model: model.toasts,
          view: ToastsExample.view,
          toParentMessage: (message) =>
            toParentMessage(Message.GotToastsMessage({ message })),
        }),
    },
  }) satisfies SectionsById;
