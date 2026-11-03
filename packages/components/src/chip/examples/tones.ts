import { Chip, Wrap } from "@gjermundgaraba/components";
import type { Html, HtmlBuilder } from "foldkit/html";

export const view = <Message>(h: HtmlBuilder<Message>): Html =>
  Wrap.view(
    {
      body: [
        Chip.view({ label: "draft" }, h),
        Chip.view({ label: "live", tone: "Go" }, h),
        Chip.view({ label: "late", tone: "Warn" }, h),
        Chip.view({ label: "blocked", tone: "Blocked" }, h),
        Chip.view({ label: "done", tone: "Done" }, h),
        Chip.view({ label: "building", isBusy: true }, h),
      ],
    },
    h
  );
