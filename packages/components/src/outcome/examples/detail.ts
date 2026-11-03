import { Outcome } from "@gjermundgaraba/components";
import type { Html, HtmlBuilder } from "foldkit/html";

export const view = <Message>(h: HtmlBuilder<Message>): Html =>
  Outcome.view(
    {
      title: "Allow access?",
      body: ["clankerbot asks to act for you in this space."],
      detail: [
        h.ul(
          [],
          [
            h.li([], ["Read the pages you can read"]),
            h.li([], ["Post as you in the chat"]),
          ]
        ),
      ],
    },
    h
  );
