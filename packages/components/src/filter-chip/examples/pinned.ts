import { FilterChip, Group } from "@gjermundgaraba/components";
import type { Html, HtmlBuilder } from "foldkit/html";

export const view = <Message>(h: HtmlBuilder<Message>): Html =>
  Group.view(
    {
      body: [
        FilterChip.view({ label: "Mine", isPressed: true }, h),
        FilterChip.view(
          { label: "Ops", full: "Scope: Operations", isPressed: true },
          h
        ),
        FilterChip.view({ label: "Archived" }, h),
      ],
    },
    h
  );
