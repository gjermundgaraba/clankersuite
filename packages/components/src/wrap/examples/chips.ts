import { Chip, Wrap } from "@gjermundgaraba/components";
import type { Html, HtmlBuilder } from "foldkit/html";

export const view = <Message>(h: HtmlBuilder<Message>): Html =>
  Wrap.view(
    {
      attributes: [h.Role("group"), h.AriaLabel("States")],
      body: [
        Chip.view({ label: "Draft" }, h),
        Chip.view({ label: "Review", tone: "Warn" }, h),
        Chip.view({ label: "Blocked", tone: "Blocked" }, h),
        Chip.view({ label: "Done", tone: "Done" }, h),
      ],
    },
    h
  );
