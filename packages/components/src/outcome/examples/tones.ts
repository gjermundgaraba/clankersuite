import { Outcome, Stack } from "@gjermundgaraba/components";
import type { Html, HtmlBuilder } from "foldkit/html";

export const view = <Message>(h: HtmlBuilder<Message>): Html =>
  Stack.view(
    {
      gap: "L",
      body: [
        Outcome.view(
          {
            title: "Session ended",
            body: ["You were away for a while. Sign in again to go on."],
          },
          h
        ),
        Outcome.view(
          {
            title: "Access refused",
            tone: "Error",
            body: ["This space is shared with its members only."],
          },
          h
        ),
        Outcome.view(
          {
            title: "Signed in",
            tone: "Ok",
            body: ["You can close this tab and go back to the terminal."],
          },
          h
        ),
        Outcome.view(
          {
            title: "Service away",
            tone: "Quiet",
            body: ["The archive is being moved. It is back within the hour."],
          },
          h
        ),
      ],
    },
    h
  );
