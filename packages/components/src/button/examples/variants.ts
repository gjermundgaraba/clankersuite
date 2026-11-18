import { Button, Wrap } from "@gjermundgaraba/components";
import type { Html, HtmlBuilder } from "foldkit/html";

export const view = <Message>(h: HtmlBuilder<Message>): Html =>
  Wrap.view(
    {
      body: [
        Button.view({ label: "Keep" }, h),
        Button.view({ label: "Save", variant: "Primary" }, h),
        Button.view({ label: "Add", glyph: "plus" }, h),
        Button.view({ label: "Publish", isDisabled: true }, h),
      ],
    },
    h
  );
