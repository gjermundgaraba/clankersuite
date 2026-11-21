import { NavStrip } from "@gjermundgaraba/components";
import type { Html, HtmlBuilder } from "foldkit/html";

export const view = <Message>(h: HtmlBuilder<Message>): Html =>
  NavStrip.view(
    {
      label: "Sections",
      items: [
        { href: "#queue", label: "Queue", count: 3, isCurrent: true },
        { href: "#review", label: "Review", count: 12 },
        { href: "#done", label: "Done" },
      ],
    },
    h
  );
