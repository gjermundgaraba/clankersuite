import { EmptyState } from "@gjermundgaraba/components";
import type { Html, HtmlBuilder } from "foldkit/html";

export const view = <Message>(h: HtmlBuilder<Message>): Html =>
  EmptyState.view(
    {
      title: "Inbox zero",
      headingLevel: 2,
      glyph: "check",
      body: [
        "Everything has a place. New captures from you and your agents land here.",
      ],
    },
    h
  );
