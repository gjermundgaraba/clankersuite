import { IconButton } from "@gjermundgaraba/components";
import type { Html, HtmlBuilder } from "foldkit/html";

export const view = <Message>(h: HtmlBuilder<Message>): Html =>
  IconButton.view({ glyph: "cross", label: "Close" }, h);
