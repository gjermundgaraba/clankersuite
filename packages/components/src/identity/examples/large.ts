import { Identity } from "@gjermundgaraba/components";
import type { Html, HtmlBuilder } from "foldkit/html";

export const view = <Message>(h: HtmlBuilder<Message>): Html =>
  Identity.view(
    { label: "Northwind Traders", meta: ["provider"], isLarge: true },
    h
  );
