import { EmptyState, LinkButton, Panel } from "@gjermundgaraba/pixel-paper";
import type { Html, HtmlBuilder } from "foldkit/html";

import { componentsRouter, foundationsRouter, screenUrl } from "../route.ts";

export const view = <Message>(h: HtmlBuilder<Message>): Html =>
  Panel.view(
    {
      id: "not-found",
      title: "Not found",
      meta: "404",
      body: [
        EmptyState.view(
          {
            title: "No page here",
            headingLevel: 3,
            body: [
              "Nothing lives at this address. The specimen has its foundations, its components, and the screens built from them.",
            ],
            actions: [
              h.span(
                [h.Class("spec-inline")],
                [
                  LinkButton.view(
                    {
                      label: "foundations",
                      href: foundationsRouter(),
                      isSmall: true,
                    },
                    h
                  ),
                  LinkButton.view(
                    {
                      label: "components",
                      href: componentsRouter(),
                      isSmall: true,
                    },
                    h
                  ),
                  LinkButton.view(
                    {
                      label: "screens",
                      href: screenUrl("queue"),
                      isSmall: true,
                    },
                    h
                  ),
                ]
              ),
            ],
          },
          h
        ),
      ],
    },
    h
  );
