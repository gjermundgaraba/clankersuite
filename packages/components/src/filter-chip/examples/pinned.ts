import { FilterChip, Group } from "@gjermundgaraba/components";
import type { Html, HtmlBuilder } from "foldkit/html";

export const view = <Message>(h: HtmlBuilder<Message>): Html =>
  Group.view(
    {
      body: [
        FilterChip.view({ label: "mine", isPressed: true }, h),
        FilterChip.view(
          { label: "ops", full: "Scope: Operations", isPressed: true },
          h
        ),
        FilterChip.view({ label: "archived" }, h),
      ],
    },
    h
  );
