import { Crumbs } from "@gjermundgaraba/components";
import type { Html, HtmlBuilder } from "foldkit/html";

export const view = <Message>(h: HtmlBuilder<Message>): Html =>
  Crumbs.view(
    {
      crumbs: [
        { label: "Library", href: "#library" },
        { label: "Notes", href: "#notes" },
        { label: "Field notes" },
      ],
    },
    h
  );
