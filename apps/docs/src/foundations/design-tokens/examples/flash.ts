import {
  Announcer,
  Button,
  LiveRegion,
  Panel,
} from "@gjermundgaraba/components";
import { Schema } from "effect";
import type { Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";

export const Model = Schema.Struct({});

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  ClickedCommit: {},
  CompletedFlash: {},
  CompletedAnnounce: {},
});

export type Message = typeof Message.Type;

export const DRAFT_PANEL_ID = "flash-draft";

export const init = (): Update.Return<Model, Message> => ({ model: {} });

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    ClickedCommit: () => ({
      model,
      commands: [
        Announcer.Flash({ selector: `#${DRAFT_PANEL_ID}` }),
        Announcer.Announce({ text: "Committed." }),
      ],
    }),
    CompletedFlash: () => ({ model }),
    CompletedAnnounce: () => ({ model }),
  });

export const view = (_model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [],
    [
      Panel.view(
        {
          id: DRAFT_PANEL_ID,
          title: "Draft",
          actions: [
            Button.view(
              {
                label: "commit",
                isSmall: true,
                onClick: Message.ClickedCommit(),
              },
              h
            ),
          ],
          body: ["Release notes for 0.5.0, ready to commit."],
        },
        h
      ),
      ...LiveRegion.place([], () => LiveRegion.view({}, h)).toPageView(),
    ]
  );
