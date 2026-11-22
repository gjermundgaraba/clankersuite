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
            keyNotes: {
              notes: [
                { keys: "Enter", does: "export" },
                { keys: "Escape", does: "cancel" },
              ],
              platform: "Other",
            },
            actions: [
              Button.view({ label: "Cancel" }, h),
              Button.view({ label: "Export", variant: "Primary" }, h),
            ],
          },
          h
        ),
        Card.view(
          {
            title: "Signed out",
            isNarrow: true,
            body: [h.p([], ["Your session ended on this device."])],
            actions: [Button.view({ label: "Sign in", variant: "Primary" }, h)],
          },
          h
        ),
      ],
    },
    h
  );
