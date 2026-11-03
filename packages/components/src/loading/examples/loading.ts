import { Loading } from "@gjermundgaraba/components";
import type { Html, HtmlBuilder } from "foldkit/html";

export const view = <Message>(h: HtmlBuilder<Message>): Html =>
  Loading.view({ isLoading: true, label: "loading the items" }, h);
