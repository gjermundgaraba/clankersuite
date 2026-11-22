import { Chip, Wrap } from "@gjermundgaraba/components";
import type { Html, HtmlBuilder } from "foldkit/html";

export const view = <Message>(h: HtmlBuilder<Message>): Html =>
  Wrap.view(
    {
      body: [
        Chip.view({ label: "Fri 20 Nov", glyph: "flag", isFlat: true }, h),
        Chip.view({ label: "Tomorrow", glyph: "calendar", isFlat: true }, h),
        Chip.view({ label: "0/3", isFlat: true }, h),
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
      ],
    },
    h
  );
