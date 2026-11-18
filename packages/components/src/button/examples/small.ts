import { Button, Wrap } from "@gjermundgaraba/components";
import type { Html, HtmlBuilder } from "foldkit/html";

export const view = <Message>(h: HtmlBuilder<Message>): Html =>
  Wrap.view(
    {
      body: [
        Button.view({ label: "Copy", isSmall: true }, h),
        Button.view({ label: "Save", variant: "Primary", isSmall: true }, h),
        Button.view({ label: "Add", glyph: "plus", isSmall: true }, h),
      ],
    },
    h
  );
