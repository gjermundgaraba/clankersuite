import { Places } from "@gjermundgaraba/components";
import type { Html, HtmlBuilder } from "foldkit/html";

export const view = <Message>(h: HtmlBuilder<Message>): Html =>
  Places.view(
    {
      label: "Collections",
      places: [
        {
          id: "reading",
          label: "Reading",
          glyph: "book",
          isCurrent: true,
          href: "#reading",
        },
        {
          id: "listening",
          label: "Listening",
          glyph: "volume",
          href: "#listening",
        },
        {
          id: "watching",
          label: "Watching",
          glyph: "monitor",
          href: "#watching",
        },
      ],
    },
    h
  );
