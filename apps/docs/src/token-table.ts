import { Table } from "@gjermundgaraba/components";
import { Array, Option, Predicate } from "effect";
import type { Html, HtmlBuilder } from "foldkit/html";

import type { Token } from "./token-css.ts";
import {
  PALETTES,
  computedValue,
  descriptionOf,
  kindOf,
  semanticAlias,
  semanticTokensUnder,
} from "./tokens.ts";
import type { Kind } from "./tokens.ts";

const UI_FONT = "var(--semantic-font-family-ui)";

type Voice = Readonly<{
  words: string;
  family?: string;
  tracking?: string;
  weight?: string;
}>;

const pixel = (words: string): Voice => ({ words, family: UI_FONT });

const pixelCaps = (
  words: string,
  tracking = "var(--semantic-dimension-letter-spacing-caps)"
): Voice => ({ words, family: UI_FONT, tracking });

const PROSE_HEADING = "var(--semantic-font-weight-prose-heading)";

/** How each font-size token's row writes its samples, by the token's name. */
export const VOICES = new Map<string, readonly Voice[]>(
  Object.entries({
    "--semantic-dimension-font-size-label": [
      pixelCaps(
        "Owner name · Last seen · Grants",
        "var(--semantic-dimension-letter-spacing-label)"
      ),
    ],
    "--semantic-dimension-font-size-state": [
      pixelCaps("active · retrying · 2d · v4"),
    ],
    "--semantic-dimension-font-size-control": [
      pixelCaps("save · sign out · sort by due"),
      { words: "A note under a field." },
    ],
    "--semantic-dimension-font-size-body": [
      pixelCaps("Sources · Keys"),
      { words: "Renew the signing certificate" },
    ],
    "--semantic-dimension-font-size-name": [pixelCaps("Operations · Requests")],
    "--semantic-dimension-font-size-title": [
      { words: "Renew the signing certificate", weight: "600" },
    ],
    "--semantic-dimension-font-size-page": [pixelCaps("Queue")],
    "--semantic-dimension-font-size-page-narrow": [pixelCaps("Queue")],
    "--semantic-dimension-font-size-wordmark": [pixel("clankersuite")],
    "--semantic-dimension-font-size-wordmark-wall": [pixel("clankersuite")],
    "--semantic-dimension-font-size-figure": [pixel("41,200")],
    "--semantic-dimension-font-size-figure-narrow": [pixel("41,200")],
    "--semantic-dimension-font-size-prose-body": [
      { words: "Every release goes out in two steps." },
    ],
    "--semantic-dimension-font-size-prose-code": [
      { words: "vp run ready", family: "var(--semantic-font-family-code)" },
    ],
    "--semantic-dimension-font-size-prose-heading-3": [
      { words: "Switching traffic", weight: PROSE_HEADING },
    ],
    "--semantic-dimension-font-size-prose-heading-2": [
      { words: "Before the window", weight: PROSE_HEADING },
    ],
    "--semantic-dimension-font-size-prose-title": [
      { words: "Rollout checklist", weight: PROSE_HEADING },
    ],
    "--semantic-dimension-font-size-prose-title-narrow": [
      { words: "Rollout checklist", weight: PROSE_HEADING },
    ],
  })
);

const SPECIMEN = "Printed paper, 0123456789";

const voiceStyle = (token: Token, voice: Voice) => ({
  fontSize: `var(${token.name})`,
  ...(voice.family === undefined ? {} : { fontFamily: voice.family }),
  ...(voice.tracking === undefined
    ? {}
    : { letterSpacing: voice.tracking, textTransform: "uppercase" }),
  ...(voice.weight === undefined ? {} : { fontWeight: voice.weight }),
});

const sizesView = <Message>(token: Token, h: HtmlBuilder<Message>): Html =>
  h.span(
    [h.Class("site-token-voices")],
    Array.map(VOICES.get(token.name) ?? [{ words: SPECIMEN }], (voice) =>
      h.keyed("span")(
        voice.words,
        [h.Style(voiceStyle(token, voice))],
        [voice.words]
      )
    )
  );

const swatchesView = <Message>(token: Token, h: HtmlBuilder<Message>): Html =>
  h.span(
    [h.Class("site-token-swatches")],
    Array.map(PALETTES, (palette) =>
      h.keyed("span")(palette.name, [
        h.Class(`site-token-swatch site-palette-${palette.scheme}`),
        h.Style({ background: `var(${token.name})` }),
      ])
    )
  );

type SampleView = <Message>(
  token: Token,
  h: HtmlBuilder<Message>
) => readonly Html[];

const SAMPLES: Readonly<Record<Kind, SampleView>> = {
  Colour: (token, h) => [swatchesView(token, h)],
  Shadow: (token, h) => [
    h.span([
      h.Class("site-token-box"),
      h.Style({ boxShadow: `var(${token.name})` }),
    ]),
  ],
  Font: (token, h) => [
    h.span([h.Style({ fontFamily: `var(${token.name})` })], [SPECIMEN]),
  ],
  Size: (token, h) => [sizesView(token, h)],
  Tracking: (token, h) => [
    h.span(
      [
        h.Style({
          fontFamily: UI_FONT,
          letterSpacing: `var(${token.name})`,
          textTransform: "uppercase",
        }),
      ],
      ["Printed paper"]
    ),
  ],
  Weight: (token, h) => [
    h.span(
      [
        h.Style({
          fontWeight: `var(${token.name})`,
          fontSize: "var(--semantic-dimension-font-size-prose-heading-2)",
        }),
      ],
      ["Printed paper"]
    ),
  ],
  Length: (token, h) => [
    h.span([
      h.Class("site-token-bar"),
      h.Style({ width: `min(var(${token.name}), 100%)` }),
    ]),
  ],
  Value: () => [],
};

const valueView = <Message>(
  token: Token,
  h: HtmlBuilder<Message>
): readonly Html[] => {
  const alias = semanticAlias(token);

  const value = computedValue(token);

  const computed = Predicate.isString(value)
    ? [h.span([], [value])]
    : Array.map(PALETTES, ({ name, scheme }) =>
        h.keyed("span")(name, [], [`${name} ${value[scheme]}`])
      );

  return [
    h.span(
      [h.Class("site-token-value")],
      [...(alias === undefined ? [] : [h.code([], [alias])]), ...computed]
    ),
  ];
};

/** The `::Tokens{prefix="..."}` island: a table of the semantic tokens the prefix names,
 *  each with its name and what it is for, a sample drawn with it, and what it computes to in each palette. */
export const tokensView =
  <Message>(h: HtmlBuilder<Message>) =>
  ({ prefix }: Readonly<{ prefix: string }>): Html =>
    Table.view(
      {
        label: `${prefix} tokens`,
        rowKey: ({ name }) => name,
        rows: semanticTokensUnder(prefix),
        columns: [
          {
            key: "token",
            header: "Token",
            cell: (token) => [
              h.span(
                [h.Class("site-token-name")],
                [
                  h.code([], [token.name]),
                  ...Option.toArray(
                    Option.map(descriptionOf(token), (description) =>
                      h.span([], [description])
                    )
                  ),
                ]
              ),
            ],
          },
          {
            key: "sample",
            header: "Sample",
            cell: (token) => SAMPLES[kindOf(token)](token, h),
          },
          {
            key: "value",
            header: "Value",
            cell: (token) => valueView(token, h),
          },
        ],
      },
      h
    );
