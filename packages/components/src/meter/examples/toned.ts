import { Meter, Panel } from "@gjermundgaraba/components";
import type { Html, HtmlBuilder } from "foldkit/html";

export const view = <Message>(h: HtmlBuilder<Message>): Html =>
  Panel.view(
    {
      id: "limits",
      title: "Limits",
      isFlush: true,
      body: [
        Meter.listView(
          {
            meters: [
              {
                id: "limits-session",
                label: "Session",
                value: 34,
                max: 100,
                valueText: "34% used",
                hasNumbers: false,
                isToned: true,
                foot: ["Resets in 3 hours"],
              },
              {
                id: "limits-weekly",
                label: "Weekly",
                value: 94,
                max: 100,
                valueText: "94% used",
                hasNumbers: false,
                isToned: true,
                foot: ["Resets in 2 days"],
              },
              {
                id: "limits-monthly",
                label: "Monthly",
                value: 100,
                max: 100,
                valueText: "100% used",
                hasNumbers: false,
                isToned: true,
                foot: ["Resets in 11 days"],
              },
            ],
          },
          h
        ),
      ],
    },
    h
  );
