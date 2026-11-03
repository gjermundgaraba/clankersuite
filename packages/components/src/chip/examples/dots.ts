import { Chip, Wrap } from "@gjermundgaraba/components";
import type { Html, HtmlBuilder } from "foldkit/html";

export const view = <Message>(h: HtmlBuilder<Message>): Html =>
  Wrap.view(
    {
      body: [
        Chip.dotView({ label: "draft" }, h),
        Chip.dotView({ label: "live", tone: "Go" }, h),
        Chip.dotView({ label: "late", tone: "Warn" }, h),
        Chip.dotView({ label: "blocked", tone: "Blocked" }, h),
        Chip.dotView({ label: "done", tone: "Done" }, h),
      ],
    },
    h
  );
