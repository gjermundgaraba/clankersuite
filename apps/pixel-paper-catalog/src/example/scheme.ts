import { Scheme } from "@gjermundgaraba/pixel-paper";
import type { Html, HtmlBuilder } from "foldkit/html";

import { rowView, specView } from "../spec.ts";

export const view = <Message>(
  schemeSwitch: Scheme.SchemeSwitch.Model,
  toParentMessage: (message: Scheme.SchemeSwitch.Message) => Message,
  h: HtmlBuilder<Message>
): Html =>
  rowView(
    [
      specView(
        "system, paper, plum: remembered on this device",
        [
          h.submodel({
            slotId: "scheme-example",
            model: schemeSwitch,
            view: Scheme.SchemeSwitch.view,
            toParentMessage,
          }),
        ],
        h
      ),
    ],
    h
  );
