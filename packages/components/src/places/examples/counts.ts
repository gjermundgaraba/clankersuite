import { Places } from "@gjermundgaraba/components";
import type { GlyphName } from "@gjermundgaraba/icons";
import { Array, Schema } from "effect";
import type { Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";

const Area = Schema.Literals(["Inbox", "Focus", "Outline", "Someday"]);

type Area = typeof Area.Type;

const AREAS: ReadonlyArray<
  Readonly<{ area: Area; glyph: GlyphName; count?: number }>
> = [
  { area: "Inbox", glyph: "inbox", count: 3 },
  { area: "Focus", glyph: "star", count: 5 },
  { area: "Outline", glyph: "layers", count: 1280 },
  { area: "Someday", glyph: "archive" },
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
  Places.view(
    {
      label: "Lists",
      places: Array.map(AREAS, ({ area, ...counted }) => ({
        ...counted,
        id: area,
        label: area,
        isCurrent: model.area === area,
        onSelect: Message.SelectedArea({ area }),
      })),
    },
    h
  );
