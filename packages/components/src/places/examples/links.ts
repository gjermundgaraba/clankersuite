import { Panel, Places } from "@gjermundgaraba/components";
import type { Html, HtmlBuilder } from "foldkit/html";

export const view = <Message>(h: HtmlBuilder<Message>): Html =>
  Panel.view(
    {
      id: "places-collections",
      title: "collections",
      isFlush: true,
      body: [
        Places.view(
          {
            label: "Collections",
            places: [
              {
                id: "reading",
                label: "Reading",
                isCurrent: true,
                href: "#reading",
              },
              { id: "listening", label: "Listening", href: "#listening" },
              { id: "watching", label: "Watching", href: "#watching" },
            ],
          },
          h
        ),
      ],
    },
    h
  );
