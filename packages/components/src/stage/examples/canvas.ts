import {
  Button,
  LinkState,
  Notice,
  Stage,
  TopBar,
  Window,
  Wordmark,
} from "@gjermundgaraba/components";
import { Schema } from "effect";
import type { Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";

export const Model = Schema.Struct({ isLinkDropped: Schema.Boolean });

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  ClickedToggleLink: {},
  GotTopBarMessage: { message: TopBar.Message },
});

export type Message = typeof Message.Type;

export const init = (): Update.Return<Model, Message> => ({
  model: { isLinkDropped: true },
});

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    ClickedToggleLink: () => ({
      model: modifyFields(model, { isLinkDropped: (isDropped) => !isDropped }),
    }),
    GotTopBarMessage: () => ({ model }),
  });

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [],
    [
      TopBar.view(
        {
          brand: [Wordmark.view({ label: "ledger" }, h)],
          tools: [
            LinkState.view(
              { state: model.isLinkDropped ? "Reconnecting" : "Online" },
              h
            ),
            Button.view(
              {
                label: model.isLinkDropped ? "Reconnect" : "Drop the link",
                isSmall: true,
                onClick: Message.ClickedToggleLink(),
              },
              h
            ),
          ],
          toParentMessage: (message) => Message.GotTopBarMessage({ message }),
        },
        h
      ),
      Stage.view(
        {
          ...(model.isLinkDropped && {
            paused: [
              Notice.view(
                {
                  title: "Editing paused",
                  body: [
                    "The link to the host dropped. Reconnecting now; nothing on the canvas is lost.",
                  ],
                },
                h
              ),
            ],
          }),
          body: [
            Window.view(
              {
                id: "canvas-notes",
                title: "Notes",
                glyph: "note",
                body: [h.p([], ["Three boxes and an arrow."])],
              },
              h
            ),
          ],
        },
        h
      ),
    ]
  );
