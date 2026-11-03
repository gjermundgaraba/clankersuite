import { NavStrip } from "@gjermundgaraba/components";
import type { Html, HtmlBuilder } from "foldkit/html";

export const view = <Message>(h: HtmlBuilder<Message>): Html =>
  NavStrip.view(
    {
      label: "Sections",
      items: [
        { href: "#queue", label: "queue", count: 3, isCurrent: true },
        { href: "#review", label: "review", count: 12 },
        { href: "#done", label: "done" },
      ],
    },
    h
  );
