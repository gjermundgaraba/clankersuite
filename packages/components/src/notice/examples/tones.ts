import { Notice, Stack } from "@gjermundgaraba/components";
import type { Html, HtmlBuilder } from "foldkit/html";

export const view = <Message>(h: HtmlBuilder<Message>): Html =>
  Stack.view(
    {
      body: [
        Notice.view(
          { body: ["Changes made here are not saved until you sign in."] },
          h
        ),
        Notice.view(
          {
            tone: "Error",
            title: "Not moved",
            body: ["The archive is read-only here."],
          },
          h
        ),
        Notice.view({ tone: "Ok", body: ["Saved to every device."] }, h),
        Notice.view(
          {
            tone: "Quiet",
            glyph: "sync",
            body: ["Synced 3 changes from your phone."],
          },
          h
        ),
      ],
    },
    h
  );
