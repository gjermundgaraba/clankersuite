import { Panel, Stack } from "@gjermundgaraba/components";
import type { Html, HtmlBuilder } from "foldkit/html";

export const view = <Message>(h: HtmlBuilder<Message>): Html =>
  Stack.view(
    {
      gap: "L",
      body: [
        Panel.view(
          {
            id: "stack-open",
            title: "open",
            meta: "4",
            body: [h.p([], ["Four items are open."])],
          },
          h
        ),
        Panel.view(
          {
            id: "stack-waiting",
            title: "waiting",
            meta: "2",
            body: [h.p([], ["Two items wait on someone."])],
          },
          h
        ),
      ],
    },
    h
  );
