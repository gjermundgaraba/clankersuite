import { Crumbs } from "@gjermundgaraba/components";
import type { Html, HtmlBuilder } from "foldkit/html";

export const view = <Message>(h: HtmlBuilder<Message>): Html =>
  Crumbs.view(
    {
      crumbs: [
        { label: "library", href: "#library" },
        { label: "notes", href: "#notes" },
        { label: "field notes" },
      ],
    },
    h
  );
