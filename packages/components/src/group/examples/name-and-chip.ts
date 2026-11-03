import { Chip, Group } from "@gjermundgaraba/components";
import type { Html, HtmlBuilder } from "foldkit/html";

export const view = <Message>(h: HtmlBuilder<Message>): Html =>
  Group.view(
    {
      body: ["release 4.2", Chip.view({ label: "live", tone: "Go" }, h)],
    },
    h
  );
