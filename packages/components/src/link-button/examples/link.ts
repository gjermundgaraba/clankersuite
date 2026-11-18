import { LinkButton, Wrap } from "@gjermundgaraba/components";
import type { Html, HtmlBuilder } from "foldkit/html";

export const view = <Message>(h: HtmlBuilder<Message>): Html =>
  Wrap.view(
    {
      body: [
        LinkButton.view(
          {
            label: "Open the docs",
            href: "/components/button",
            glyph: "arrow-right",
          },
          h
        ),
        LinkButton.view(
          {
            label: "Sign in",
            href: "/components/password-field",
            variant: "Primary",
          },
          h
        ),
        LinkButton.view(
          {
            label: "Icon buttons",
            href: "/components/icon-button",
            isSmall: true,
          },
          h
        ),
      ],
    },
    h
  );
