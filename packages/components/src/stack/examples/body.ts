import { Button, Group, Notice, Stack } from "@gjermundgaraba/components";
import type { Html, HtmlBuilder } from "foldkit/html";

export const view = <Message>(h: HtmlBuilder<Message>): Html =>
  Stack.view(
    {
      body: [
        Notice.view(
          {
            tone: "Quiet",
            body: ["Two windows are read-only while the review runs."],
          },
          h
        ),
        h.p([], ["The review ends when every reviewer has signed off."]),
        Group.view(
          {
            body: [
              Button.view({ label: "sign off", variant: "Primary" }, h),
              Button.view({ label: "ask a question" }, h),
            ],
          },
          h
        ),
      ],
    },
    h
  );
