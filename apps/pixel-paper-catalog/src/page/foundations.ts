import { Clipboard } from "@effect/platform-browser";
import { Button as UiButton } from "@foldkit/ui";
import {
  Announcer,
  Button,
  EmptyState,
  FilterChip,
  FilterStrip,
  Glyph,
  Prose,
  QueryChip,
} from "@gjermundgaraba/pixel-paper";
import { Array, Effect, Option, Record, Schema, pipe } from "effect";
import * as Command from "foldkit/command";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";
import { defineView } from "foldkit/submodel";
import type * as Update from "foldkit/update";

import { FOUNDATIONS } from "../covers.ts";
import type * as DocIndex from "../doc-index.ts";
import ENTRY_SERVER_SOURCE from "../entry.server.ts?raw";
import ENTRY_SOURCE from "../entry.ts?raw";
import LIVE_REGION_SOURCE from "../live-region.ts?raw";
import { rowView, sectionView, sourceView, specView } from "../spec.ts";
import type { SectionConfig } from "../spec.ts";
import { kindOf, resolveColour, tokenSections } from "../tokens.ts";
import type { Kind, Palette, Token, TokenSection } from "../tokens.ts";

export const Model = Schema.Struct({
  glyphQuery: Schema.String,
  maybeFamily: Schema.Option(Schema.String),
});

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  UpdatedGlyphQuery: { value: Schema.String },
  ToggledFamily: { family: Schema.String },
  ClickedClearGlyphFilter: {},
  ClickedGlyph: { name: Schema.String },
  SucceededCopyGlyphName: { name: Schema.String },
  FailedCopyGlyphName: {},
  ClickedFlash: {},
  CompletedAnnounce: {},
  CompletedFlash: {},
});

export type Message = typeof Message.Type;

export const init = (): Model => ({
  glyphQuery: "",
  maybeFamily: Option.none(),
});

export const CopyGlyphName = Command.define("CopyGlyphName", {
  args: { name: Schema.String },
  messages: [Message.SucceededCopyGlyphName, Message.FailedCopyGlyphName],
  execute: ({ name }) =>
    Effect.gen(function* () {
      const clipboard = yield* Clipboard.Clipboard;

      return yield* clipboard.writeString(name);
    }).pipe(
      Effect.as(Message.SucceededCopyGlyphName({ name })),
      Effect.orElseSucceed(() => Message.FailedCopyGlyphName())
    ),
});

const glyphTileId = (name: string): string => `glyph-${name}`;

const FLASH_BOX_ID = "motion-flash-box";

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message, Clipboard.Clipboard>>(message, {
    UpdatedGlyphQuery: ({ value }) => ({
      model: modifyFields(model, { glyphQuery: () => value }),
    }),
    ToggledFamily: ({ family }) => ({
      model: modifyFields(model, {
        maybeFamily: (maybeFamily) =>
          Option.contains(maybeFamily, family)
            ? Option.none()
            : Option.some(family),
      }),
    }),
    ClickedClearGlyphFilter: () => ({ model: init() }),
    ClickedGlyph: ({ name }) => ({
      model,
      commands: [CopyGlyphName({ name })],
    }),
    SucceededCopyGlyphName: ({ name }) => ({
      model,
      commands: [
        Announcer.Flash({ selector: `#${glyphTileId(name)}` }),
        Announcer.Announce({ text: `Copied ${name}.` }),
      ],
    }),
    FailedCopyGlyphName: () => ({
      model,
      commands: [
        Announcer.Announce({
          text: "Copy failed: the clipboard is not available here.",
        }),
      ],
    }),
    ClickedFlash: () => ({
      model,
      commands: [
        Announcer.Flash({ selector: `#${FLASH_BOX_ID}` }),
        Announcer.Announce({ text: "Committed." }),
      ],
    }),
    CompletedAnnounce: () => ({ model }),
    CompletedFlash: () => ({ model }),
  });

const TOKEN_SECTIONS = tokenSections();

export const entries: readonly DocIndex.Entry[] = [
  { id: "system", title: "pixel paper" },
  { id: "setup", title: "Setting up" },
  ...Array.map(TOKEN_SECTIONS, ({ id, title }) => ({ id, title })),
  { id: "glyphs", title: "Glyphs" },
];

type Voice = Readonly<{
  words: string;
  isPx?: boolean;
  tracking?: string;
  weight?: string;
}>;

const px = (words: string, tracking = "var(--tracking-caps)"): Voice => ({
  words,
  isPx: true,
  tracking,
});

const VOICES: Readonly<Record<string, readonly Voice[]>> = {
  "--type-label": [
    px("Owner name · Last seen · Grants", "var(--tracking-label)"),
  ],
  "--type-state": [px("active · retrying · 2d · v4")],
  "--type-control": [
    px("save · sign out · sort by due"),
    { words: "A note under a field." },
  ],
  "--type-body": [
    px("Sources · Keys"),
    { words: "Renew the signing certificate" },
  ],
  "--type-name": [px("Operations · Requests")],
  "--type-title": [{ words: "Renew the signing certificate", weight: "600" }],
  "--type-page": [px("Queue")],
  "--type-page-narrow": [px("Queue")],
  "--type-wordmark": [{ words: "pixel paper", isPx: true }],
  "--type-wordmark-wall": [{ words: "pixel paper", isPx: true }],
  "--type-figure": [{ words: "41,200", isPx: true }],
  "--type-figure-narrow": [{ words: "41,200", isPx: true }],
  "--read-body": [{ words: "Every release goes out in two steps." }],
  "--read-h3": [{ words: "Switching traffic", weight: "var(--read-weight)" }],
  "--read-h2": [{ words: "Before the window", weight: "var(--read-weight)" }],
  "--read-title": [
    { words: "Rollout checklist", weight: "var(--read-weight)" },
  ],
};

const voiceStyle = (token: string, voice: Voice): Record<string, string> => ({
  fontSize: `var(${token})`,
  ...(voice.tracking === undefined
    ? {}
    : { letterSpacing: voice.tracking, textTransform: "uppercase" }),
  ...(voice.weight === undefined ? {} : { fontWeight: voice.weight }),
});

const sizesView = <ParentMessage>(
  token: string,
  h: HtmlBuilder<ParentMessage>
): Html =>
  h.span(
    [h.Class("token-sizes")],
    Array.map(VOICES[token] ?? [{ words: "Printed paper" }], (voice) =>
      h.keyed("span")(
        voice.words,
        [
          ...(voice.isPx === true ? [h.Class("px")] : []),
          h.Style(voiceStyle(token, voice)),
        ],
        [voice.words]
      )
    )
  );

const PALETTES: readonly Palette[] = ["paper", "plum"];

const colourChipView = <ParentMessage>(
  token: Token,
  palette: Palette,
  h: HtmlBuilder<ParentMessage>
): Html =>
  h.keyed("span")(
    palette,
    [h.Class(`token-chip spec-scheme ${palette}`)],
    [
      h.span([
        h.Class("swatch-chip"),
        h.Style({ background: `var(${token.name})` }),
      ]),
      h.span(
        [h.Class("swatch-value")],
        [`${palette} ${resolveColour(token.value, palette)}`]
      ),
    ]
  );

type SampleView = <ParentMessage>(
  token: Token,
  value: string,
  h: HtmlBuilder<ParentMessage>
) => readonly Html[];

const SAMPLE_VIEWS: Readonly<Record<Kind, SampleView>> = {
  Colour: (token, _value, h) => [
    h.span(
      [h.Class("token-chips")],
      Array.map(PALETTES, (palette) => colourChipView(token, palette, h))
    ),
  ],
  Image: (_token, value, h) => [
    h.span(
      [h.Class("token-image")],
      [h.span([h.Style({ background: value })])]
    ),
  ],
  Shadow: (_token, value, h) => [
    h.span([h.Class("spec-box"), h.Style({ boxShadow: value })]),
  ],
  Font: (_token, value, h) => [
    h.span([h.Style({ fontFamily: value })], ["Printed paper, 0123456789"]),
  ],
  Size: (token, _value, h) => [sizesView(token.name, h)],
  Tracking: (_token, value, h) => [
    h.span(
      [h.Class("px caps"), h.Style({ letterSpacing: value })],
      ["Printed paper"]
    ),
  ],
  Weight: (_token, value, h) => [
    h.span(
      [h.Style({ fontWeight: value, fontSize: "var(--read-h2)" })],
      ["Printed paper"]
    ),
  ],
  Length: (_token, value, h) => [
    h.span([h.Class("token-bar"), h.Style({ "--w": value })]),
  ],
  Value: () => [],
};

const sampleView = <ParentMessage>(
  token: Token,
  h: HtmlBuilder<ParentMessage>
): readonly Html[] =>
  SAMPLE_VIEWS[kindOf(token)](token, `var(${token.name})`, h);

const tokenRowView = <ParentMessage>(
  token: Token,
  h: HtmlBuilder<ParentMessage>
): Html =>
  h.keyed("div")(
    token.name,
    [h.Class("token-row")],
    [
      h.code([h.Class("token-name")], [token.name]),
      h.div([h.Class("token-sample")], sampleView(token, h)),
      h.code([h.Class("token-value")], [token.value]),
    ]
  );

const inkCellView = <ParentMessage>(
  token: Token,
  h: HtmlBuilder<ParentMessage>
): Html =>
  h.keyed("li")(
    token.name,
    [h.Class("ink-cell")],
    [
      h.span(
        [h.Class("ink-swatch"), h.AriaHidden(true)],
        Array.map(PALETTES, (palette) =>
          h.keyed("span")(palette, [
            h.Class(`spec-scheme ${palette}`),
            h.Style({ background: `var(${token.name})` }),
          ])
        )
      ),
      h.code([h.Class("token-name")], [token.name]),
      h.span(
        [h.Class("swatch-value")],
        [
          `${token.value.startsWith("var(") ? `${token.value} · ` : ""}${Array.map(
            PALETTES,
            (palette) => resolveColour(token.value, palette)
          ).join(" · ")}`,
        ]
      ),
    ]
  );

type TokensInUse = Readonly<{
  covers?: readonly string[];
  about?: string;
  body: readonly Html[];
}>;

const readingAtWork = (h: HtmlBuilder<Message>): TokensInUse => ({
  body: [
    h.div(
      [h.Class("token-group")],
      [
        h.h3([h.Class("spec-caption")], ["the reading scale at work"]),
        Prose.view(
          {
            body: [
              h.p(
                [],
                [
                  "Body text on the reading scale, in the system sans, held to the reading measure. It is the one place the system slows down; the chrome around it stays on the working scale.",
                ]
              ),
            ],
          },
          h
        ),
      ]
    ),
  ],
});

const motionAtWork = (h: HtmlBuilder<Message>): TokensInUse => ({
  covers: FOUNDATIONS.motion,
  about:
    "Nothing eases. A committed change inverts the element for one beat; a card arrives in three steps; a cursor blinks in whole steps. Reduced motion swaps each for a still sign.",
  body: [
    h.div(
      [h.Class("token-group")],
      [
        h.h3([h.Class("spec-caption")], ["in use"]),
        rowView(
          [
            specView(
              "--motion-flash · the invert flash",
              [h.div([h.Class("spec-box"), h.Id(FLASH_BOX_ID)], ["committed"])],
              h
            ),
            specView(
              "flash it",
              [
                Button.view(
                  { label: "commit a change", onClick: Message.ClickedFlash() },
                  h
                ),
              ],
              h
            ),
            specView(
              "--motion-blink · the busy cursor",
              [Button.view({ label: "saving", isBusy: true }, h)],
              h
            ),
          ],
          h
        ),
      ]
    ),
  ],
});

const tokenGroupView = <ParentMessage>(
  title: string,
  group: TokenSection["groups"][number],
  h: HtmlBuilder<ParentMessage>
): Html =>
  h.keyed("div")(
    group.name === "" ? title : group.name,
    [h.Class("token-group")],
    [
      ...(group.name === ""
        ? []
        : [h.h3([h.Class("spec-caption")], [group.name])]),
      ...(group.name.startsWith("content")
        ? [
            h.ul(
              [h.Class("ink-grid")],
              Array.map(group.tokens, (token) => inkCellView(token, h))
            ),
          ]
        : Array.map(group.tokens, (token) => tokenRowView(token, h))),
    ]
  );

const IN_USE: Readonly<
  Record<string, (h: HtmlBuilder<Message>) => TokensInUse>
> = {
  type: readingAtWork,
  motion: motionAtWork,
};

const tokenSectionConfig = (
  section: TokenSection,
  h: HtmlBuilder<Message>
): SectionConfig => {
  const { covers, about, body } = Option.match(Record.get(IN_USE, section.id), {
    onNone: (): TokensInUse => ({ body: [] }),
    onSome: (inUse) => inUse(h),
  });

  return {
    id: section.id,
    title: section.title,
    meta: `${section.count}`,
    covers,
    about,
    body: [
      ...Array.map(section.groups, (group) =>
        tokenGroupView(section.title, group, h)
      ),
      ...body,
    ],
  };
};

const FAMILIES: ReadonlyArray<readonly [string, readonly Glyph.GlyphName[]]> =
  Array.map(
    Record.toEntries(Glyph.glyphFamilies),
    ([family, members]): readonly [string, readonly Glyph.GlyphName[]] => [
      family,
      Array.filter(Record.keys(Glyph.glyphs), (name) => name in members),
    ]
  );

const shownFamilies = (
  model: Model
): ReadonlyArray<readonly [string, readonly Glyph.GlyphName[]]> => {
  const query = model.glyphQuery.trim().toLowerCase();

  return pipe(
    FAMILIES,
    Array.filter(
      ([family]) =>
        Option.isNone(model.maybeFamily) ||
        Option.contains(model.maybeFamily, family)
    ),
    Array.map(
      ([family, names]) =>
        [family, Array.filter(names, (name) => name.includes(query))] as const
    ),
    Array.filter(([, names]) => Array.isReadonlyArrayNonEmpty(names))
  );
};

const glyphTileView = (name: Glyph.GlyphName, h: HtmlBuilder<Message>): Html =>
  h.keyed("li")(
    name,
    [],
    [
      UiButton.view(
        {
          onClick: Message.ClickedGlyph({ name }),
          toView: (attributes) =>
            h.button(
              [
                ...attributes.button,
                h.Id(glyphTileId(name)),
                h.AriaLabel(`Copy ${name}`),
              ],
              [
                h.span([h.Class("big")], [Glyph.view({ name, size: 24 }, h)]),
                h.span([h.Class("names")], [Glyph.view({ name }, h), name]),
              ]
            ),
        },
        h
      ),
    ]
  );

const familyView = (
  family: string,
  names: readonly Glyph.GlyphName[],
  h: HtmlBuilder<Message>
): Html =>
  h.keyed("section")(
    family,
    [h.Class("glyph-family"), h.AriaLabelledBy(`glyphs-${family}`)],
    [
      h.h3(
        [h.Class("spec-caption"), h.Id(`glyphs-${family}`)],
        [`${family} · ${names.length}`]
      ),
      h.ul(
        [h.Class("glyph-grid")],
        Array.map(names, (name) => glyphTileView(name, h))
      ),
    ]
  );

const glyphFilterView = (model: Model, h: HtmlBuilder<Message>): Html =>
  FilterStrip.view(
    {
      label: "Find a glyph",
      body: [
        QueryChip.view(
          {
            id: "glyph-query",
            label: "find",
            value: model.glyphQuery,
            onInput: (value) => Message.UpdatedGlyphQuery({ value }),
            placeholder: "a name",
          },
          h
        ),
        ...Array.map(FAMILIES, ([family, names]) =>
          FilterChip.view(
            {
              label: `${family} · ${names.length}`,
              isPressed: Option.contains(model.maybeFamily, family),
              onToggle: Message.ToggledFamily({ family }),
            },
            h
          )
        ),
      ],
    },
    h
  );

const glyphsBody = (model: Model, h: HtmlBuilder<Message>): readonly Html[] => {
  const shown = shownFamilies(model);

  return [
    glyphFilterView(model, h),
    ...Array.match(shown, {
      onEmpty: () => [
        EmptyState.view(
          {
            title: "No glyph by that name",
            headingLevel: 3,
            body: ["Try a shorter part of the name, or clear the family."],
            actions: [
              Button.view(
                {
                  label: "clear the filter",
                  isSmall: true,
                  onClick: Message.ClickedClearGlyphFilter(),
                },
                h
              ),
            ],
          },
          h
        ),
      ],
      onNonEmpty: (families) =>
        Array.map(families, ([family, names]) => familyView(family, names, h)),
    }),
  ];
};

export const view = defineView<Model, Message>((model, h): Html =>
  h.div(
    [h.Class("spec-stack")],
    [
      sectionView(
        {
          id: "system",
          title: "pixel paper",
          meta: "design system",
          body: [
            h.div(
              [h.Class("spec-intro")],
              [
                h.p(
                  [],
                  [
                    "Printed paper panels on a dithered ground: 2px ink borders, solid print shadows, inverted title bars, a pixel monospace for every control and 12×12 cell glyphs for every icon. Two palettes, paper and plum, of one token set. Built for dense working interfaces: queues, boards, consoles, editors, and the documents beside them.",
                  ]
                ),
                h.p(
                  [h.Class("spec-caption")],
                  [
                    "This page is the system documenting itself, a Foldkit application rendered at build time and hydrated in your browser: every token below is read from tokens.css, and every colour is shown in both palettes.",
                  ]
                ),
              ]
            ),
          ],
        },
        h
      ),
      sectionView(
        {
          id: "setup",
          title: "Setting up",
          meta: "once per app",
          about:
            "What an application does once: import the stylesheet, put schemeScript in the head before it, and provide Clipboard.layer as the application's resources, for CopyButton. Place the page's live parts with LiveRegion.place on every render, so what Announcer.Announce says is heard and the toasts can be reached while a dialog is open, and return SkipLink.ScrollToFragment from the URL handler. These are this specimen's own entries.",
          covers: FOUNDATIONS.setup,
          body: [
            sourceView("entry.ts", ENTRY_SOURCE, h),
            sourceView("entry.server.ts", ENTRY_SERVER_SOURCE, h),
            sourceView("live-region.ts", LIVE_REGION_SOURCE, h),
          ],
        },
        h
      ),
      ...Array.map(TOKEN_SECTIONS, (section) =>
        sectionView(tokenSectionConfig(section, h), h)
      ),
      sectionView(
        {
          id: "glyphs",
          title: "Glyphs",
          meta: `${Record.size(Glyph.glyphs)} on one 12×12 grid`,
          covers: FOUNDATIONS.glyphs,
          about:
            "Filled cells only: no curves, no other icon set. Each is shown at 24px to read the cells and at 12px, the size it is drawn for. Find one by name or family; press one to copy its name.",
          body: glyphsBody(model, h),
        },
        h
      ),
    ]
  )
);
