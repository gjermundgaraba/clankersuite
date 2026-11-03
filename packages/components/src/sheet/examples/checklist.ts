import { Button, Prose, Sheet } from "@gjermundgaraba/components";
import type { Html, HtmlBuilder } from "foldkit/html";

export const view = <Message>(h: HtmlBuilder<Message>): Html =>
  Sheet.view(
    {
      title: "Rollout checklist",
      byline: ["v4 · sam · 2 days ago"],
      actions: [Button.view({ label: "edit", isSmall: true }, h)],
      body: [
        Prose.view(
          {
            body: [
              h.p(
                [],
                [
                  "Every release goes out in two steps. The chrome around this page stays on the working scale; the page itself reads at its own pace.",
                ]
              ),
              h.h2([], ["Before the window"]),
              h.ul(
                [],
                [
                  h.li([], ["Announce the window a day ahead."]),
                  h.li(
                    [],
                    [
                      "Check that ",
                      h.code([], ["before-deploy.sh"]),
                      " drains the old nodes.",
                    ]
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
