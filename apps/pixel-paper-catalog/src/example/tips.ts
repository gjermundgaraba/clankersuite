import { IconButton, Tips } from "@gjermundgaraba/pixel-paper";
import type { Html, HtmlBuilder } from "foldkit/html";

import { rowView, specView } from "../spec.ts";

export const layerView = <Message>(
  model: Tips.Model,
  toParentMessage: (message: Tips.Message) => Message,
  h: HtmlBuilder<Message>
): Html =>
  h.submodel({
    slotId: Tips.id(model),
    model,
    view: Tips.view,
    toParentMessage,
  });

const tools = <Message>(h: HtmlBuilder<Message>): readonly Html[] => [
  IconButton.view({ glyph: "pencil", label: "Rename" }, h),
  IconButton.view({ glyph: "copy", label: "Copy link" }, h),
  IconButton.view({ glyph: "trash", label: "Delete", isQuiet: true }, h),
];

export const view = <Message>(h: HtmlBuilder<Message>): Html =>
  rowView(
    [
      specView(
        "rest the pointer on a glyph button, or reach it with Tab: the tip says its name",
        [h.span([h.Class("spec-inline")], tools(h))],
        h
      ),
    ],
    h
  );
