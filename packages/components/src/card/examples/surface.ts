import { Button, Card, Stack } from "@gjermundgaraba/components";
import type { Html, HtmlBuilder } from "foldkit/html";

export const view = <Message>(h: HtmlBuilder<Message>): Html =>
  Stack.view(
    {
      gap: "L",
      body: [
        Card.view(
          {
            title: "Export",
            meta: "3 files",
            body: [
              h.p(
                [],
                [
                  "field-notes.md, budget.csv and garden.md go into one archive.",
                ]
              ),
            ],
            lead: [Button.view({ label: "choose files", isSmall: true }, h)],
            actions: [
              Button.view({ label: "cancel" }, h),
              Button.view(
                { label: "export", variant: "Primary", isDefault: true },
                h
              ),
            ],
          },
          h
        ),
        Card.view(
          {
            title: "Signed out",
            isNarrow: true,
            body: [h.p([], ["Your session ended on this device."])],
            actions: [
              Button.view(
                { label: "sign in", variant: "Primary", isDefault: true },
                h
              ),
            ],
          },
          h
        ),
      ],
    },
    h
  );
