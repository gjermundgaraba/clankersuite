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

type Voice = Readonly<{
  words: string;
  family?: string;
  weight?: string;
}>;

const BRAND_FONT = "var(--semantic-font-family-brand)";

const PROSE_HEADING = "var(--semantic-font-weight-prose-heading)";

export const VOICES = new Map<string, readonly Voice[]>(
  Object.entries({
    "--semantic-dimension-font-size-label": [
      { words: "Owner name · Active · 2d" },
    ],
    "--semantic-dimension-font-size-control": [
      { words: "Save · Sign out · Sort by due" },
    ],
    "--semantic-dimension-font-size-body": [
      { words: "Renew the signing certificate" },
    ],
    "--semantic-dimension-font-size-title": [
      { words: "Renew the signing certificate", weight: "600" },
    ],
    "--semantic-dimension-font-size-page": [{ words: "Queue" }],
    "--semantic-dimension-font-size-page-narrow": [{ words: "Queue" }],
    "--semantic-dimension-font-size-wordmark": [
      { words: "clankersuite", family: BRAND_FONT },
    ],
    "--semantic-dimension-font-size-wordmark-wall": [
      { words: "clankersuite", family: BRAND_FONT },
    ],
    "--semantic-dimension-font-size-figure": [{ words: "41,200" }],
    "--semantic-dimension-font-size-figure-narrow": [{ words: "41,200" }],
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
          letterSpacing: `var(${token.name})`,
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
