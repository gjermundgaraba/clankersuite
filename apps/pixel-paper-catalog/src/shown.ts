import { Effect } from "effect";
import { Server } from "foldkit/experimental";
import type { Attribute, Html, HtmlBuilder } from "foldkit/html";

export const SHOWN_SELECTOR = "[data-catalog-shown]";

export const shownAttribute = <Message>(
  h: HtmlBuilder<Message>
): Attribute<Message> => h.DataAttribute("catalog-shown", "");

export const markupOf = (body: Html): string =>
  Effect.runSync(
    Server.renderToString(
      { init: () => ({ model: undefined }), view: () => ({ title: "", body }) },
      { isHydratable: false }
    )
  ).html;
