import { Button, Wrap } from "@gjermundgaraba/components";
import type { Html, HtmlBuilder } from "foldkit/html";

export const view = <Message>(h: HtmlBuilder<Message>): Html =>
  Wrap.view(
    {
      body: [
        Button.view({ label: "copy", isSmall: true }, h),
        Button.view({ label: "save", variant: "Primary", isSmall: true }, h),
        Button.view({ label: "add", glyph: "plus", isSmall: true }, h),
      ],
    },
    h
  );
