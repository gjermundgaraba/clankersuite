import { Panel, Stack, Text } from "@gjermundgaraba/components";
import type { Html, HtmlBuilder } from "foldkit/html";

export const view = <Message>(h: HtmlBuilder<Message>): Html =>
  Panel.view(
    {
      id: "text-tones",
      title: "Members",
      body: [
        Stack.view(
          {
            body: [
              h.p([], ["ada@example.com ", Text.meta(["owner"], h)]),
              Text.note(["An invited member can sign in once they accept."], h),
            ],
          },
          h
        ),
      ],
    },
    h
  );
