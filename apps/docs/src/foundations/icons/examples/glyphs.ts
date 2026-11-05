import { Clipboard } from "@effect/platform-browser";
import {
  Announcer,
  Button,
  EmptyState,
  FilterChip,
  LiveRegion,
  Panel,
  QueryChip,
  Stack,
  Wrap,
} from "@gjermundgaraba/components";
import type { GlyphName } from "@gjermundgaraba/icons";
import { Array, Effect, Option, Schema, pipe } from "effect";
import { Command } from "foldkit";
import type { Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";

type Family = readonly [family: string, names: readonly GlyphName[]];

export const FAMILIES: readonly Family[] = [
  [
    "direction",
    [
      "caret-down",
      "caret-right",
      "caret-up",
      "arrow-up",
      "arrow-down",
      "arrow-left",
      "arrow-right",
      "arrow-up-right",
      "back",
      "backlink",
      "external",
      "corner-down-right",
      "enter",
      "swap",
      "move",
      "sort",
      "expand",
      "shrink",
      "upload",
      "download",
      "skip-back",
      "skip-next",
    ],
  ],
  [
    "actions",
    [
      "plus",
      "minus",
      "cross",
      "check",
      "pencil",
      "copy",
      "clipboard",
      "trash",
      "save",
      "search",
      "zoom-in",
      "zoom-out",
      "filter",
      "more",
      "more-vertical",
      "settings",
      "gear",
      "undo",
      "redo",
      "sync",
      "refresh",
      "link",
      "unlink",
      "pin",
      "send",
      "log-in",
      "log-out",
    ],
  ],
  [
    "state",
    [
      "bang",
      "info",
      "question",
      "warning",
      "ban",
      "dot",
      "mark",
      "ring",
      "ring-closed",
      "box",
      "box-done",
      "circle",
      "star",
      "bookmark",
      "flag",
      "bell",
      "bell-off",
      "eye",
      "eye-off",
      "lock",
      "unlock",
      "clock",
      "hourglass",
      "spark",
      "sun",
      "moon",
      "contrast",
    ],
  ],
  [
    "media",
    [
      "play",
      "pause",
      "stop",
      "record",
      "power",
      "mic",
      "mic-off",
      "volume",
      "volume-off",
      "image",
      "captions",
    ],
  ],
  [
    "layout",
    [
      "outline",
      "list",
      "bars",
      "columns",
      "grid",
      "tiles",
      "table",
      "fit",
      "sidebar",
      "panel-right",
      "panel-bottom",
      "split",
      "window",
      "layers",
      "grip",
      "pointer",
      "hand",
      "text",
    ],
  ],
  [
    "documents",
    [
      "page",
      "file-plus",
      "note",
      "script",
      "folder",
      "folder-open",
      "folder-plus",
      "stack",
      "archive",
      "inbox",
      "embed",
      "book",
      "heading",
      "quote",
      "code",
      "hash",
      "calendar",
    ],
  ],
  [
    "people",
    [
      "user",
      "users",
      "user-plus",
      "id-card",
      "key",
      "shield",
      "shield-check",
      "bot",
      "mail",
      "chat",
      "globe",
      "home",
      "location",
    ],
  ],
  [
    "systems",
    [
      "terminal",
      "machine",
      "drum",
      "chip",
      "network",
      "cloud",
      "cloud-off",
      "wifi",
      "wifi-off",
      "plug",
      "puzzle",
      "package",
      "rocket",
      "bug",
      "flask",
      "monitor",
      "phone",
      "keyboard",
    ],
  ],
  [
    "versions",
    ["branch", "merge", "fork", "commit", "diff", "snapshot", "tag"],
  ],
  [
    "readings",
    [
      "chart-bar",
      "trend-up",
      "trend-down",
      "activity",
      "percent",
      "bolt",
      "battery",
      "card",
      "receipt",
    ],
  ],
];

export const Model = Schema.Struct({
  query: Schema.String,
  maybeFamily: Schema.Option(Schema.String),
});

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  UpdatedQuery: { value: Schema.String },
  ToggledFamily: { family: Schema.String },
  ClickedClearFilter: {},
  ClickedGlyph: { name: Schema.String },
  SucceededCopyGlyphName: { name: Schema.String },
  FailedCopyGlyphName: {},
  CompletedFlash: {},
  CompletedAnnounce: {},
});

export type Message = typeof Message.Type;

const EMPTY: Model = { query: "", maybeFamily: Option.none() };

export const init = (): Update.Return<Model, Message> => ({ model: EMPTY });

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

export const glyphButtonId = (name: string): string => `glyph-${name}`;

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message, Clipboard.Clipboard>>(message, {
    UpdatedQuery: ({ value }) => ({
      model: modifyFields(model, { query: () => value }),
    }),
    ToggledFamily: ({ family }) => ({
      model: modifyFields(model, {
        maybeFamily: (maybeFamily) =>
          Option.contains(maybeFamily, family)
            ? Option.none()
            : Option.some(family),
      }),
    }),
    ClickedClearFilter: () => ({ model: EMPTY }),
    ClickedGlyph: ({ name }) => ({
      model,
      commands: [CopyGlyphName({ name })],
    }),
    SucceededCopyGlyphName: ({ name }) => ({
      model,
      commands: [
        Announcer.Flash({ selector: `#${glyphButtonId(name)}` }),
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
    CompletedFlash: () => ({ model }),
    CompletedAnnounce: () => ({ model }),
  });

export const resources = Clipboard.layer;

const shownFamilies = (model: Model): readonly Family[] => {
  const query = model.query.trim().toLowerCase();

  return pipe(
    FAMILIES,
    Array.filter(
      ([family]) =>
        Option.isNone(model.maybeFamily) ||
        Option.contains(model.maybeFamily, family)
    ),
    Array.map(([family, names]): Family => [
      family,
      Array.filter(names, (name) => name.includes(query)),
    ]),
    Array.filter(([, names]) => Array.isReadonlyArrayNonEmpty(names))
  );
};

const filterView = (model: Model, h: HtmlBuilder<Message>): Html =>
  Wrap.view(
    {
      attributes: [h.Role("group"), h.AriaLabel("Find a glyph")],
      body: [
        QueryChip.view(
          {
            id: "glyph-query",
            label: "find",
            value: model.query,
            onInput: (value) => Message.UpdatedQuery({ value }),
            placeholder: "a name",
          },
          h
        ),
        ...Array.map(FAMILIES, ([family]) =>
          FilterChip.view(
            {
              label: family,
              key: family,
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

const familyView = ([family, names]: Family, h: HtmlBuilder<Message>): Html =>
  Panel.view(
    {
      id: `glyphs-${family}`,
      title: family,
      meta: `${names.length}`,
      body: [
        Wrap.view(
          {
            body: Array.map(names, (name) =>
              Button.view(
                {
                  label: name,
                  glyph: name,
                  isSmall: true,
                  onClick: Message.ClickedGlyph({ name }),
                  attributes: [
                    h.Id(glyphButtonId(name)),
                    h.AriaLabel(`Copy ${name}`),
                  ],
                },
                h
              )
            ),
          },
          h
        ),
      ],
    },
    h
  );

const emptyView = (h: HtmlBuilder<Message>): Html =>
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
            onClick: Message.ClickedClearFilter(),
          },
          h
        ),
      ],
    },
    h
  );

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  Stack.view(
    {
      body: [
        filterView(model, h),
        ...Array.match(shownFamilies(model), {
          onEmpty: () => [emptyView(h)],
          onNonEmpty: (families) =>
            Array.map(families, (family) => familyView(family, h)),
        }),
        ...LiveRegion.place([], () => LiveRegion.view({}, h)).toPageView(),
      ],
    },
    h
  );
