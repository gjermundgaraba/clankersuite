import type { Html, HtmlBuilder } from "foldkit/html";

import type { Attributes } from "../attributes/attributes.ts";
import { LOCALE } from "../locale/locale.ts";

export type CountParts<Message> = Readonly<{
  name: Attributes<Message>;
  view: readonly Html[];
}>;

export const countParts = <Message>(
  label: string,
  count: number | undefined,
  h: HtmlBuilder<Message>
): CountParts<Message> => {
  if (count === undefined) {
    return { name: [], view: [] };
  }

  const number = count.toLocaleString(LOCALE);

  return {
    name: [h.AriaLabel(`${label}, ${number}`)],
    view: [h.span([h.Class("gg-count gg-tnum")], [number])],
  };
};
