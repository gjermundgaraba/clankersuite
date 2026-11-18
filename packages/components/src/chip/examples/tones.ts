import { Chip, Wrap } from "@gjermundgaraba/components";
import type { Html, HtmlBuilder } from "foldkit/html";

export const view = <Message>(h: HtmlBuilder<Message>): Html =>
  Wrap.view(
    {
      body: [
        Chip.view({ label: "Draft" }, h),
        Chip.view({ label: "Live", tone: "Go" }, h),
        Chip.view({ label: "Late", tone: "Warn" }, h),
        Chip.view({ label: "Blocked", tone: "Blocked" }, h),
        Chip.view({ label: "Done", tone: "Done" }, h),
        Chip.view({ label: "Building", isBusy: true }, h),
      ],
    },
    h
  );
