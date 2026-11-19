import { Group, Marker, Wrap } from "@gjermundgaraba/components";
import type { Html, HtmlBuilder } from "foldkit/html";

const AREAS: ReadonlyArray<readonly [string, Marker.Colour]> = [
  ["Work", "Amber"],
  ["Home", "Sky"],
];

const GOALS: ReadonlyArray<readonly [string, Marker.Colour]> = [
  ["Launch clankermem v1", "Coral"],
  ["Calmer home admin", "Sand"],
];

export const view = <Message>(h: HtmlBuilder<Message>): Html =>
  Wrap.view(
    {
      body: [
        ...AREAS.map(([name, colour]) =>
          Group.view({ body: [Marker.view({ colour }, h), name] }, h)
        ),
        ...GOALS.map(([name, colour]) =>
          Group.view(
            { body: [Marker.view({ colour, kind: "Goal" }, h), name] },
            h
          )
        ),
      ],
    },
    h
  );
