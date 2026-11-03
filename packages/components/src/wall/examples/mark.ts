import { Button, Card, Wall, Wordmark } from "@gjermundgaraba/components";
import type { Html, HtmlBuilder } from "foldkit/html";

export const view = <Message>(h: HtmlBuilder<Message>): Html =>
  Card.view(
    {
      title: "Sign in",
      isNarrow: true,
      body: [
        Wall.markView({ brand: [Wordmark.view({ label: "ledger" }, h)] }, h),
        h.p([], ["Sign in to see the ledger's books."]),
      ],
      actions: [Button.view({ label: "sign in", variant: "Primary" }, h)],
    },
    h
  );
