import { Array } from "effect";
import type { Html, HtmlBuilder } from "foldkit/html";

import type { Attributes } from "../attributes/attributes.ts";

type SlotTag = "div" | "span" | "p" | "dd" | "ul";

export const slotView = <Message>(
  tag: SlotTag,
  slotClass: string,
  slot: ReadonlyArray<Html | string>,
  h: HtmlBuilder<Message>,
  attributes: Attributes<Message> = []
): readonly Html[] =>
  Array.match(slot, {
    onEmpty: () => [],
    onNonEmpty: (content) => [
      h[tag]([...attributes, h.Class(slotClass)], content),
    ],
  });
