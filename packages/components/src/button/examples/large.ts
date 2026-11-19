import { Button, Wrap } from "@gjermundgaraba/components";
import type { Html, HtmlBuilder } from "foldkit/html";

export const view = <Message>(h: HtmlBuilder<Message>): Html =>
  Wrap.view(
    {
      body: [
        Button.view({ label: "Back", variant: "Ghost", isLarge: true }, h),
        Button.view(
          {
            label: "Start the day",
            glyph: "sun",
            variant: "Primary",
            isLarge: true,
          },
          h
        ),
      ],
    },
    h
  );
