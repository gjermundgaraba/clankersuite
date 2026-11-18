import { Button, Wrap } from "@gjermundgaraba/components";
import type { Html, HtmlBuilder } from "foldkit/html";

export const view = <Message>(h: HtmlBuilder<Message>): Html =>
  Wrap.view(
    {
      body: [
        Button.view({ label: "saving", isBusy: true }, h),
        Button.view({ label: "send", variant: "Primary", isBusy: true }, h),
        Button.view({ label: "copy", isSmall: true, isBusy: true }, h),
      ],
    },
    h
  );
