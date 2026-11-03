import { Button, Panel } from "@gjermundgaraba/components";
import type { Html, HtmlBuilder } from "foldkit/html";

export const view = <Message>(h: HtmlBuilder<Message>): Html =>
  Panel.view(
    {
      id: "panel-queue",
      title: "queue",
      meta: "3",
      actions: [Button.view({ label: "clear", isSmall: true }, h)],
      body: [h.p([], ["Three items wait for review."])],
      foot: ["Updated a minute ago."],
    },
    h
  );
