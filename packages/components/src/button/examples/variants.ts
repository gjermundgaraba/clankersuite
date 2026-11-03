import { Button, Wrap } from "@gjermundgaraba/components";
import type { Html, HtmlBuilder } from "foldkit/html";

export const view = <Message>(h: HtmlBuilder<Message>): Html =>
  Wrap.view(
    {
      body: [
        Button.view({ label: "keep" }, h),
        Button.view({ label: "save", variant: "Primary" }, h),
        Button.view({ label: "add", glyph: "plus" }, h),
        Button.view({ label: "copy", isSmall: true }, h),
        Button.view({ label: "publish", isDisabled: true }, h),
      ],
    },
    h
  );
