import { Chip, Wrap } from "@gjermundgaraba/components";
import type { Html, HtmlBuilder } from "foldkit/html";

export const view = <Message>(h: HtmlBuilder<Message>): Html =>
  Wrap.view(
    {
      attributes: [h.Role("group"), h.AriaLabel("States")],
      body: [
        Chip.view({ label: "draft" }, h),
        Chip.view({ label: "review", tone: "Warn" }, h),
        Chip.view({ label: "blocked", tone: "Blocked" }, h),
        Chip.view({ label: "done", tone: "Done" }, h),
      ],
    },
    h
  );
