import type { Marker } from "@gjermundgaraba/components";
import { Places } from "@gjermundgaraba/components";
import { Array, Schema } from "effect";
import type { Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";

const Area = Schema.Literals(["Work", "Review budget", "Launch v1", "Home"]);

type Area = typeof Area.Type;

export const Model = Schema.Struct({ area: Area });

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  SelectedArea: { area: Area },
});

export type Message = typeof Message.Type;

export const init = (): Update.Return<Model, Message> => ({
  model: { area: "Work" },
});

export const update = (_model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    SelectedArea: ({ area }) => ({ model: { area } }),
  });

const placeOf = (model: Model, area: Area) => ({
  id: area,
  label: area,
  isCurrent: model.area === area,
  onSelect: Message.SelectedArea({ area }),
});

const MARKERS: ReadonlyArray<
  Readonly<{
    area: Area;
    marker: Marker.Colour;
    count: number;
    subAreas: readonly Area[];
  }>
> = [
  {
    area: "Work",
    marker: "Amber",
    count: 6,
    subAreas: ["Review budget", "Launch v1"],
  },
  { area: "Home", marker: "Sky", count: 5, subAreas: [] },
];

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  Places.view(
    {
      label: "Areas",
      isLabelShown: true,
      places: Array.map(MARKERS, ({ area, marker, count, subAreas }) => ({
        ...placeOf(model, area),
        marker,
        count,
        subPlaces: Array.map(subAreas, (subArea) => placeOf(model, subArea)),
      })),
    },
    h
  );
