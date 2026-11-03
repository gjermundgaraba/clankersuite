import { Meter, Panel } from "@gjermundgaraba/components";
import type { Html, HtmlBuilder } from "foldkit/html";

export const view = <Message>(h: HtmlBuilder<Message>): Html =>
  Panel.view(
    {
      id: "usage",
      title: "Usage",
      isFlush: true,
      body: [
        Meter.listView(
          {
            meters: [
              {
                id: "usage-storage",
                label: "Storage",
                value: 1200,
                max: 5000,
                foot: ["Read a minute ago"],
              },
              {
                id: "usage-requests",
                label: "Requests",
                value: 41_200,
                max: 50_000,
                foot: ["Resets in 4 days"],
              },
              { id: "usage-seats", label: "Seats", value: 5, max: 5 },
              {
                id: "usage-builds",
                label: "Build minutes",
                value: 300,
                max: 1000,
                isStale: true,
                foot: ["Last read 2 hours ago: the reading failed"],
              },
              {
                id: "usage-session",
                label: "Session window",
                value: 62,
                max: 100,
                valueText: "62% used",
                hasNumbers: false,
                foot: ["Resets in 3 hours"],
              },
            ],
          },
          h
        ),
      ],
    },
    h
  );
