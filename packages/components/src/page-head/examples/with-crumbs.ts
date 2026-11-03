import { Button, Crumbs, PageHead, Stack } from "@gjermundgaraba/components";
import type { Html, HtmlBuilder } from "foldkit/html";

export const view = <Message>(h: HtmlBuilder<Message>): Html =>
  Stack.view(
    {
      body: [
        Crumbs.view(
          {
            crumbs: [
              { label: "library", href: "#library" },
              { label: "notes", href: "#notes" },
              { label: "field notes" },
            ],
          },
          h
        ),
        PageHead.view(
          {
            title: "Field notes",
            meta: "12 items",
            actions: [Button.view({ label: "add", glyph: "plus" }, h)],
          },
          h
        ),
      ],
    },
    h
  );
