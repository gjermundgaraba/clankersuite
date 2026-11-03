import { Tag, Wrap } from "@gjermundgaraba/components";
import type { Html, HtmlBuilder } from "foldkit/html";

export const view = <Message>(h: HtmlBuilder<Message>): Html =>
  Wrap.view(
    {
      body: [
        Tag.view({ label: "ops" }, h),
        Tag.view({ label: "3", full: "3 in Operations" }, h),
      ],
    },
    h
  );
