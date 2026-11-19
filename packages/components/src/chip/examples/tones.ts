import { Chip, Wrap } from "@gjermundgaraba/components";
import type { Html, HtmlBuilder } from "foldkit/html";

export const view = <Message>(h: HtmlBuilder<Message>): Html =>
  Wrap.view(
    {
      body: [
        Chip.view({ label: "Draft" }, h),
        Chip.view({ label: "On track", tone: "Go" }, h),
        Chip.view({ label: "Due today", tone: "Warn", glyph: "flag" }, h),
        Chip.view(
          { label: "Overdue 15 Nov", tone: "Blocked", glyph: "flag" },
          h
        ),
        Chip.view({ label: "Done", tone: "Done" }, h),
        Chip.view({ label: "Building", isBusy: true }, h),
      ],
    },
    h
  );
