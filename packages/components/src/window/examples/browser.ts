import {
  Announcer,
  Field,
  IconButton,
  LiveRegion,
  Window,
} from "@gjermundgaraba/components";
import { Schema } from "effect";
import type { Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";

export const Model = Schema.Struct({ address: Schema.String });

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  UpdatedAddress: { value: Schema.String },
  ClickedReload: {},
  CompletedAnnounce: {},
});

export type Message = typeof Message.Type;

export const init = (): Update.Return<Model, Message> => ({
  model: { address: "https://example.com/" },
});

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    UpdatedAddress: ({ value }) => ({ model: { address: value } }),
    ClickedReload: () => ({
      model,
      commands: [Announcer.Announce({ text: `Reloaded ${model.address}` })],
    }),
    CompletedAnnounce: () => ({ model }),
  });

const browserView = (model: Model, h: HtmlBuilder<Message>): Html =>
  Window.view(
    {
      id: "window-browser",
      title: "browser",
      glyph: "globe",
      tools: [
        IconButton.view(
          { glyph: "arrow-left", label: "Back", isDisabled: true },
          h
        ),
        IconButton.view(
          { glyph: "arrow-right", label: "Forward", isDisabled: true },
          h
        ),
        IconButton.view(
          {
            glyph: "refresh",
            label: "Reload",
            onClick: Message.ClickedReload(),
          },
          h
        ),
      ],
      body: [
        Field.view(
          {
            id: "window-browser-address",
            label: "Address",
            value: model.address,
            onInput: (value) => Message.UpdatedAddress({ value }),
            isMono: true,
            isLabelHidden: true,
          },
          h
        ),
      ],
    },
    h
  );

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [],
    [
      browserView(model, h),
      ...LiveRegion.place([], () => LiveRegion.view({}, h)).toPageView(),
    ]
  );
