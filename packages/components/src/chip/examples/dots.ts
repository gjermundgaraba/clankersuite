import { Chip, Wrap } from "@gjermundgaraba/components";
import type { Html, HtmlBuilder } from "foldkit/html";

export const view = <Message>(h: HtmlBuilder<Message>): Html =>
  Wrap.view(
    {
      body: [
        Chip.dotView({ label: "Draft" }, h),
        Chip.dotView({ label: "Live", tone: "Go" }, h),
        Chip.dotView({ label: "Late", tone: "Warn" }, h),
        Chip.dotView({ label: "Blocked", tone: "Blocked" }, h),
        Chip.dotView({ label: "Done", tone: "Done" }, h),
      ],
    },
    h
  );
