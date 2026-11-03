import { LinkButton, Wrap } from "@gjermundgaraba/components";
import type { Html, HtmlBuilder } from "foldkit/html";

export const view = <Message>(h: HtmlBuilder<Message>): Html =>
  Wrap.view(
    {
      body: [
        LinkButton.view(
          {
            label: "open the docs",
            href: "/components/button",
            glyph: "arrow-right",
          },
          h
        ),
        LinkButton.view(
          {
            label: "sign in",
            href: "/components/password-field",
            variant: "Primary",
          },
          h
        ),
        LinkButton.view(
          {
            label: "icon buttons",
            href: "/components/icon-button",
            isSmall: true,
          },
          h
        ),
      ],
    },
    h
  );
