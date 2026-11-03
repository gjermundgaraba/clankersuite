import { Button, History } from "@gjermundgaraba/components";
import type { Html, HtmlBuilder } from "foldkit/html";

export const view = <Message>(h: HtmlBuilder<Message>): Html =>
  History.view(
    {
      label: "Versions of rollout.md",
      entries: [
        {
          id: "v4",
          at: ["v4"],
          who: ["sam"],
          what: ["Raised the limit"],
          isCurrent: true,
        },
        {
          id: "v3",
          at: ["v3"],
          who: ["ops"],
          what: ["Rollback"],
          actions: [Button.view({ label: "restore", isSmall: true }, h)],
        },
        { id: "v2", at: ["v2"], who: ["sam"], what: ["First draft"] },
      ],
    },
    h
  );
