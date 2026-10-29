import { Button, KeyHelp, KeyHint } from "@gjermundgaraba/pixel-paper";
import { Array } from "effect";
import type { Html, HtmlBuilder } from "foldkit/html";

import { rowView, specView } from "../spec.ts";

export const view = <Message>(
  bindings: readonly KeyHelp.Binding[],
  platform: KeyHint.KeyPlatform,
  onShowKeys: Message,
  h: HtmlBuilder<Message>
): Html =>
  rowView(
    [
      specView(
        "a key hint per binding, printed for your keyboard",
        [
          h.span(
            [h.Class("spec-inline")],
            Array.map(
              [
                ...Array.flatMap(bindings, ({ keys }) => keys),
                KeyHelp.HELP_KEYS,
              ],
              (keys) => KeyHint.view({ keys, platform }, h)
            )
          ),
        ],
        h
      ),
      specView(
        "the key help: ? opens it anywhere on the page",
        [
          Button.view(
            {
              label: "show the keys",
              keyHint: { keys: KeyHelp.HELP_KEYS, platform },
              onClick: onShowKeys,
            },
            h
          ),
        ],
        h
      ),
    ],
    h
  );
