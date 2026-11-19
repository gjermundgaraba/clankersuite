import { Button, Chip, PageHead } from "@gjermundgaraba/components";
import type { Html, HtmlBuilder } from "foldkit/html";

export const view = <Message>(h: HtmlBuilder<Message>): Html =>
  PageHead.view(
    {
      title: "Focus",
      glyph: "star",
      meta: "Wednesday 18 November · 7 to do",
      actions: [
        Button.view({ label: "New task", glyph: "plus", variant: "Ghost" }, h),
      ],
      strip: [
        Chip.view(
          {
            label: "Calmer home admin",
            marker: { colour: "Sky", kind: "Goal" },
            count: 1,
            isLarge: true,
            href: "#calmer-home-admin",
          },
          h
        ),
        Chip.view(
          {
            label: "Ship the beta",
            marker: { colour: "Amber", kind: "Goal" },
            count: 2,
            isLarge: true,
            href: "#ship-the-beta",
          },
          h
        ),
      ],
    },
    h
  );
