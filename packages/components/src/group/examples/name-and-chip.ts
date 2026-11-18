import { Chip, Group } from "@gjermundgaraba/components";
import type { Html, HtmlBuilder } from "foldkit/html";

export const view = <Message>(h: HtmlBuilder<Message>): Html =>
  Group.view(
    {
      body: ["Release 4.2", Chip.view({ label: "Live", tone: "Go" }, h)],
    },
    h
  );
