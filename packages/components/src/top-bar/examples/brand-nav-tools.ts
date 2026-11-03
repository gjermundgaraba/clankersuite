import {
  LinkState,
  NavStrip,
  TopBar,
  Wordmark,
} from "@gjermundgaraba/components";
import { Schema } from "effect";
import type { Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";

export const Model = Schema.Struct({});

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  GotTopBarMessage: { message: TopBar.Message },
});

export type Message = typeof Message.Type;

export const init = (): Update.Return<Model, Message> => ({ model: {} });

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    GotTopBarMessage: () => ({ model }),
  });

export const view = (_model: Model, h: HtmlBuilder<Message>): Html =>
  TopBar.view(
    {
      brand: [Wordmark.view({ label: "ledger" }, h)],
      nav: [
        NavStrip.view(
          {
            label: "Sections",
            items: [
              { href: "#queue", label: "queue", count: 3, isCurrent: true },
              { href: "#done", label: "done" },
            ],
          },
          h
        ),
      ],
      tools: [LinkState.view({ state: "Online" }, h)],
      toParentMessage: (message) => Message.GotTopBarMessage({ message }),
    },
    h
  );
