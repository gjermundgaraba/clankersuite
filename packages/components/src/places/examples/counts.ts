import { Panel, Places } from "@gjermundgaraba/components";
import { Array, Schema } from "effect";
import type { Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";

const Area = Schema.Literals(["Inbox", "Focus", "Later", "Archive"]);

type Area = typeof Area.Type;

const AREAS: ReadonlyArray<Readonly<{ area: Area; count?: number }>> = [
  { area: "Inbox", count: 3 },
  { area: "Focus", count: 5 },
  { area: "Later", count: 128 },
  { area: "Archive" },
];

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
      id: "places-counts",
      title: "Mail",
      isFlush: true,
      body: [
        Places.view(
          {
            label: "Mail",
            places: Array.map(AREAS, ({ area, ...counted }) => ({
              ...counted,
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
