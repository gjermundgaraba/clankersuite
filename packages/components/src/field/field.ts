import { Input as UiInput } from "@foldkit/ui";
import { Glyph } from "@gjermundgaraba/icons";
import type { GlyphName } from "@gjermundgaraba/icons";
import { Array, Effect, Order, Schema } from "effect";
import type {
  Attribute,
  Html,
  HtmlBuilder,
  TextareaAttribute,
} from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import * as Mount from "foldkit/mount";

import type { Attributes } from "../attributes/attributes.ts";

const errorId = (id: string): string => `${id}-error`;

export const errorView = <Message>(
  id: string,
  error: string | undefined,
  h: HtmlBuilder<Message>
): readonly Html[] =>
  error === undefined
    ? []
    : [h.p([h.Id(errorId(id)), h.Class("gg-field-error")], [error])];

const describedByError = <Message>(
  id: string,
  error: string | undefined,
  hasHelp: boolean,
  h: HtmlBuilder<Message>
): ReadonlyArray<TextareaAttribute<Message>> =>
  error === undefined
    ? []
    : [
        h.AriaDescribedBy(
          hasHelp ? `${errorId(id)} ${UiInput.descriptionId(id)}` : errorId(id)
        ),
      ];

export const controlAttributes = <Message>(
  id: string,
  error: string | undefined,
  help: string | undefined,
  isRequired: boolean,
  h: HtmlBuilder<Message>
): ReadonlyArray<TextareaAttribute<Message>> => [
  ...describedByError(id, error, help !== undefined, h),
  ...(isRequired ? [h.AriaRequired(true)] : []),
];

export const helpView = <Message>(
  help: string | undefined,
  description: ReadonlyArray<Attribute<Message>>,
  h: HtmlBuilder<Message>
): readonly Html[] =>
  help === undefined
    ? []
    : [h.p([...description, h.Class("gg-field-help")], [help])];

export type ViewConfig<Message> = Readonly<{
  id: string;
  label: string;
  value: string;
  onInput: (value: string) => Message;
  /** A sans sentence under the control. */
  help?: string;
  /** Why the value was refused: a red sentence under the control, which the control is
   *  described by, with red on its rule and its label (`aria-invalid`). Say it again in an
   *  ErrorSummary above the form. */
  error?: string | undefined;
  /** The form is not sent without it: screen readers hear "required" (`aria-required`). */
  isRequired?: boolean;
  /** How the input prints: `Line`, a baseline (the default); `Box`, for the field that is the
   *  whole job of its form (a date is always boxed); `Sheet`, the tall borderless line across
   *  a sheet's top in title-size text, ruled under, that a palette or a quick capture is
   *  typed in. */
  look?: Look;
  /** On the input's line, before it: a palette's back button and scope. */
  lead?: readonly Html[];
  /** Code and identifiers: the system monospace. */
  isMono?: boolean;
  /** The label is for screen readers only (`.sr-only`): a field whose place says what it is,
   *  such as a browser's address bar. It still names the input. */
  isLabelHidden?: boolean;
  /** The input's type (`"date"` for the browser's date control, always boxed); text when not
   *  given. */
  type?: string;
  /** Further attributes for the `<input>`, such as a Dialog's `initialFocus` group, or the
   *  keys that move through `suggestions`; never a class. */
  inputAttributes?: Attributes<Message>;
  /** Spans of the value to underline, such as the words a parser took as a date or a goal.
   *  They are drawn for the eye; say what they mean elsewhere, such as in chips. */
  marks?: readonly Mark[];
  /** Suggestions for what is being typed: the field becomes a combobox over this list. Not
   *  `@foldkit/ui`'s Combobox, whose Model owns the input's text and whose pick replaces it
   *  with one option: this field's value is the application's free text with its marks, and a
   *  pick is the application's edit of it, such as a task named after an `@`. */
  suggestions?: Suggestions<Message>;
}>;

/** How a field's input prints. */
export const Look = Schema.Literals(["Line", "Box", "Sheet"]);

export type Look = typeof Look.Type;

const LOOK_CLASS: Readonly<Record<Look, string>> = {
  Line: "",
  Box: " gg-boxed",
  Sheet: " gg-sheet-line",
};

/** The colour of a mark's underline. */
export const MarkTone = Schema.Literals(["Accent", "Warning", "Link"]);

export type MarkTone = typeof MarkTone.Type;

/** A span of a field's value, from `start` up to `end`, as string offsets. */
export type Mark = Readonly<{ start: number; end: number; tone: MarkTone }>;

/** One suggestion: a title over its context, the line that tells it from its namesakes. */
export type Suggestion<Message> = Readonly<{
  id: string;
  title: string;
  context?: string;
  glyph?: GlyphName;
  onPick: Message;
}>;

/** What the suggestions' Mount reports: it started keeping focus in the field. Nothing in a
 *  Model follows it. */
export const Message = defineMessageUnion({ CompletedBindSuggestions: {} });

export type Message = typeof Message.Type;

type FieldMessage = Message;

/** The list under a combobox field. Focus stays in the field: its own keys (passed in
 *  `inputAttributes`) move `activeId` and pick; a click picks too, and leaves focus in the
 *  field. */
export type Suggestions<Message> = Readonly<{
  /** The list's heading, which names it: `"Put it under"`. */
  label: string;
  options: ReadonlyArray<Suggestion<Message>>;
  /** The option the field's keys are on, tinted, and the field's
   *  `aria-activedescendant`. */
  activeId?: string | undefined;
  /** Lifts the list's Mount's lifecycle Message, which the parent's update takes and changes
   *  nothing for. In a Scene, resolve the Mount by name with it while the list shows:
   *  `Scene.Mount.resolve({ name: Field.BindSuggestions.name }, toParentMessage(Field.Message.CompletedBindSuggestions()))`. */
  toParentMessage: (message: FieldMessage) => Message;
}>;

const preventFocusMove = (event: Event): void => {
  event.preventDefault();
};

/** Keeps focus in the field while an option is pressed: a press on the list moves no focus,
 *  and its click still picks. Attached by `view` to the list while it shows. */
export const BindSuggestions = Mount.define("BindSuggestions", {
  messages: [Message.CompletedBindSuggestions],
  execute: ({ element }) =>
    Effect.acquireRelease(
      Effect.sync(() => {
        element.addEventListener("mousedown", preventFocusMove);
      }),
      () =>
        Effect.sync(() => {
          element.removeEventListener("mousedown", preventFocusMove);
        })
    ).pipe(Effect.as(Message.CompletedBindSuggestions())),
});

const listId = (id: string): string => `${id}-suggestions`;

const optionId = (id: string, optionKey: string): string =>
  `${id}-suggestion-${optionKey}`;

const comboboxAttributes = <Message>(
  id: string,
  suggestions: Suggestions<Message>,
  h: HtmlBuilder<Message>
): ReadonlyArray<Attribute<Message>> => {
  const isExpanded = Array.isReadonlyArrayNonEmpty(suggestions.options);

  return [
    h.Role("combobox"),
    h.AriaAutocomplete("list"),
    h.AriaExpanded(isExpanded),
    h.Autocomplete("off"),
    ...(isExpanded ? [h.AriaControls(listId(id))] : []),
    ...(isExpanded && suggestions.activeId !== undefined
      ? [h.AriaActiveDescendant(optionId(id, suggestions.activeId))]
      : []),
  ];
};

const suggestionsView = <Message>(
  id: string,
  suggestions: Suggestions<Message>,
  h: HtmlBuilder<Message>
): readonly Html[] =>
  Array.match(suggestions.options, {
    onEmpty: () => [],
    onNonEmpty: (options) => [
      h.div(
        [h.Class("gg-suggest")],
        [
          h.span(
            [h.Id(`${listId(id)}-label`), h.Class("gg-suggest-head")],
            [suggestions.label]
          ),
          h.div(
            [
              h.Id(listId(id)),
              h.Role("listbox"),
              h.AriaLabelledBy(`${listId(id)}-label`),
              h.OnMount(
                Mount.mapMessage(BindSuggestions(), suggestions.toParentMessage)
              ),
            ],
            Array.map(options, (option) =>
              h.keyed("button")(
                option.id,
                [
                  h.Type("button"),
                  h.Id(optionId(id, option.id)),
                  h.Role("option"),
                  h.Tabindex(-1),
                  h.AriaSelected(option.id === suggestions.activeId),
                  ...(option.context === undefined
                    ? []
                    : [h.AriaLabel(`${option.title}, ${option.context}`)]),
                  h.OnClick(option.onPick),
                  h.Class("gg-suggest-option"),
                ],
                [
                  ...(option.glyph === undefined
                    ? []
                    : [Glyph.view({ name: option.glyph }, h)]),
                  h.span(
                    [],
                    [
                      h.span([h.Class("gg-suggest-title")], [option.title]),
                      ...(option.context === undefined
                        ? []
                        : [
                            h.span(
                              [h.Class("gg-suggest-context")],
                              [option.context]
                            ),
                          ]),
                    ]
                  ),
                ]
              )
            )
          ),
        ]
      ),
    ],
  });

const MARK_CLASS: Readonly<Record<MarkTone, string>> = {
  Accent: "gg-accent",
  Warning: "gg-warning",
  Link: "gg-link",
};

const byStart = Order.mapInput(Order.Number, (mark: Mark) => mark.start);

const mirrorView = <Message>(
  value: string,
  marks: readonly Mark[],
  h: HtmlBuilder<Message>
): Html => {
  const ordered = Array.sort(marks, byStart);

  const { parts, end } = Array.reduce(
    ordered,
    { parts: Array.empty<Html | string>(), end: 0 },
    (state, mark) =>
      mark.start < state.end
        ? state
        : {
            parts: [
              ...state.parts,
              value.slice(state.end, mark.start),
              h.mark(
                [h.Class(MARK_CLASS[mark.tone])],
                [value.slice(mark.start, mark.end)]
              ),
            ],
            end: mark.end,
          }
  );

  return h.div(
    [h.Class("gg-field-mirror"), h.AriaHidden(true)],
    [...parts, value.slice(end)]
  );
};

const markedView = <Message>(
  input: Html,
  value: string,
  marks: readonly Mark[] | undefined,
  h: HtmlBuilder<Message>
): Html =>
  marks === undefined
    ? input
    : h.div([h.Class("gg-field-marked")], [input, mirrorView(value, marks, h)]);

const lineView = <Message>(
  control: Html,
  look: Look,
  lead: readonly Html[],
  h: HtmlBuilder<Message>
): Html =>
  look === "Sheet" || Array.isReadonlyArrayNonEmpty(lead)
    ? h.div([h.Class("gg-field-line")], [...lead, control])
    : control;

/** A labelled text input with its help line, built on `@foldkit/ui`'s `Input`: the label
 *  names the input, the help line describes it (`aria-describedby`), an `error` sets
 *  `aria-invalid` and describes it before the help, and `isRequired` sets `aria-required`.
 *  The input is a baseline that thickens in the accent on focus, unless its `look` is a box or
 *  a sheet's line. */
export const view = <Message>(
  config: ViewConfig<Message>,
  h: HtmlBuilder<Message>
): Html => {
  const {
    id,
    label,
    value,
    onInput,
    help,
    error,
    isRequired = false,
    look = "Line",
    lead = [],
    isMono = false,
    isLabelHidden = false,
    type,
    inputAttributes = [],
    marks,
    suggestions,
  } = config;

  return UiInput.view(
    {
      id,
      value,
      onInput,
      isInvalid: error !== undefined,
      ...(type !== undefined && { type }),
      hasDescription: help !== undefined,
      toView: (groups) =>
        h.div(
          [
            h.Class(
              `gg-field${LOOK_CLASS[type === "date" ? "Box" : look]}${isMono ? " gg-mono" : ""}`
            ),
          ],
          [
            h.label(
              [...groups.label, ...(isLabelHidden ? [h.Class("sr-only")] : [])],
              [label]
            ),
            lineView(
              markedView(
                h.input([
                  ...inputAttributes,
                  ...groups.input,
                  ...controlAttributes(id, error, help, isRequired, h),
                  ...(suggestions === undefined
                    ? []
                    : comboboxAttributes(id, suggestions, h)),
                ]),
                value,
                marks,
                h
              ),
              look,
              lead,
              h
            ),
            ...(suggestions === undefined
              ? []
              : suggestionsView(id, suggestions, h)),
            ...errorView(id, error, h),
            ...helpView(help, groups.description, h),
          ]
        ),
    },
    h
  );
};
