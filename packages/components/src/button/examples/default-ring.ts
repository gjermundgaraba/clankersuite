import { Button, Group } from "@gjermundgaraba/components";
import type { Html, HtmlBuilder } from "foldkit/html";

export const view = <Message>(h: HtmlBuilder<Message>): Html =>
  Group.view(
    {
      body: [
        Button.view({ label: "Cancel" }, h),
        Button.view(
          { label: "Register", variant: "Primary", isDefault: true },
          h
        ),
      ],
    },
    h
  );
