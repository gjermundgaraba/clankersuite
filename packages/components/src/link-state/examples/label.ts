import { LinkState } from "@gjermundgaraba/components";
import type { Html, HtmlBuilder } from "foldkit/html";

export const view = <Message>(h: HtmlBuilder<Message>): Html =>
  LinkState.view({ state: "Online", label: "connected" }, h);
