import { Button, Wrap } from "@gjermundgaraba/components";
import type { Html, HtmlBuilder } from "foldkit/html";

export const view = <Message>(h: HtmlBuilder<Message>): Html =>
  Wrap.view(
    {
      body: [
        Button.view({ label: "Saving", isBusy: true }, h),
        Button.view({ label: "Send", variant: "Primary", isBusy: true }, h),
        Button.view({ label: "Copy", isSmall: true, isBusy: true }, h),
      ],
    },
    h
  );
