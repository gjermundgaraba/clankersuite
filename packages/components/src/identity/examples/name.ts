import { Identity } from "@gjermundgaraba/components";
import type { Html, HtmlBuilder } from "foldkit/html";

export const view = <Message>(h: HtmlBuilder<Message>): Html =>
  Identity.view({ label: "Sam Rivera", meta: ["Client 4f2a"] }, h);
