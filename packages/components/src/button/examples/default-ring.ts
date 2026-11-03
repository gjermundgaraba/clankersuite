import { Button, Group } from "@gjermundgaraba/components";
import type { Html, HtmlBuilder } from "foldkit/html";

export const view = <Message>(h: HtmlBuilder<Message>): Html =>
  Group.view(
    {
      body: [
        Button.view({ label: "cancel" }, h),
        Button.view(
          { label: "register", variant: "Primary", isDefault: true },
          h
        ),
      ],
    },
    h
  );
