import { Panel, Places } from "@gjermundgaraba/components";
import { Array, Schema } from "effect";
import type { Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";

const Area = Schema.Literals(["Inbox", "Later", "Archive"]);

type Area = typeof Area.Type;

export const Model = Schema.Struct({ area: Area });

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  SelectedArea: { area: Area },
});

export type Message = typeof Message.Type;

export const init = (): Update.Return<Model, Message> => ({
  model: { area: "Inbox" },
});

export const update = (_model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    SelectedArea: ({ area }) => ({ model: { area } }),
  });

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  Panel.view(
    {
      id: "places-areas",
      title: "areas",
      isFlush: true,
      body: [
        Places.view(
          {
            label: "Areas",
            places: Array.map(Area.literals, (area) => ({
              id: area,
              label: area,
              isCurrent: model.area === area,
              onSelect: Message.SelectedArea({ area }),
            })),
          },
          h
        ),
      ],
    },
    h
  );
