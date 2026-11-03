import { Button, EmptyState, Panel } from "@gjermundgaraba/components";
import type { Html, HtmlBuilder } from "foldkit/html";

export const view = <Message>(h: HtmlBuilder<Message>): Html =>
  Panel.view(
    {
      id: "queue-panel",
      title: "Queue",
      body: [
        EmptyState.view(
          {
            title: "Nothing queued",
            headingLevel: 3,
            body: ["Capture a task and it waits here."],
            actions: [Button.view({ label: "capture", isSmall: true }, h)],
          },
          h
        ),
      ],
    },
    h
  );
