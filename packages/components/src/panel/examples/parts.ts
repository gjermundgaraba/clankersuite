import { Button, Panel } from "@gjermundgaraba/components";
import type { Html, HtmlBuilder } from "foldkit/html";

export const view = <Message>(h: HtmlBuilder<Message>): Html =>
  Panel.view(
    {
      id: "panel-queue",
      title: "Queue",
      meta: "3",
      actions: [Button.view({ label: "Clear", isSmall: true }, h)],
      body: [h.p([], ["Three items wait for review."])],
      foot: ["Updated a minute ago."],
      footActions: [Button.view({ label: "Review", isSmall: true }, h)],
    },
    h
  );
