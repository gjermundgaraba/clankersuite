import { LinkState, Wrap } from "@gjermundgaraba/components";
import type { Html, HtmlBuilder } from "foldkit/html";

export const view = <Message>(h: HtmlBuilder<Message>): Html =>
  Wrap.view(
    {
      body: [
        LinkState.view({ state: "Online" }, h),
        LinkState.view({ state: "Connecting" }, h),
        LinkState.view({ state: "Reconnecting" }, h),
        LinkState.view({ state: "Offline" }, h),
      ],
    },
    h
  );
