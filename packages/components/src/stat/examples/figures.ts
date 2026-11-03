import { Panel, Stat } from "@gjermundgaraba/components";
import { Option } from "effect";
import type { Html, HtmlBuilder } from "foldkit/html";

export const view = <Message>(h: HtmlBuilder<Message>): Html =>
  Panel.view(
    {
      id: "today",
      title: "Today",
      isFlush: true,
      body: [
        Stat.listView(
          {
            stats: [
              { label: "Requests today", maybeValue: Option.some(41_200) },
              { label: "Seats", maybeValue: Option.some(10) },
              { label: "Errors", maybeValue: Option.none() },
            ],
          },
          h
        ),
      ],
    },
    h
  );
