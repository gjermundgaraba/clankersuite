import { Array } from "effect";
import type { Html, HtmlBuilder } from "foldkit/html";

import type { Attributes } from "../attributes/attributes.ts";
import * as Button from "../button/button.ts";
import * as Fields from "../fields/fields.ts";
import * as IconButton from "../icon-button/icon-button.ts";
import { notesView } from "../key-hint/key-hint.ts";
import type { KeyNote } from "../key-hint/key-hint.ts";
import type { KeyPlatform } from "../key-hint/key-label.ts";
import { slotView } from "../slot/slot.ts";
import * as Text from "../text/text.ts";

/** Configuration for rendering a card with `view`. */
export type ViewConfig<Message> = Readonly<{
  /** The title, in the title bar. Without one there is no title bar: name the card's Dialog
   *  by what is in it, such as its `head`'s field. */
  title?: string;
  /** A line across the card's top, under the title bar if there is one: a Field in its
   *  `Sheet` look, the line a quick capture is typed in. */
  head?: Html;
  /** Attributes for the title, such as a Dialog's `title` group, which names the dialog. */
  titleAttributes?: Attributes<Message>;
  meta?: string;
  body: ReadonlyArray<Html | string>;
  /** Attributes for the close glyph, such as a Dialog's `closeButton` group, which closes it.
   *  The glyph prints when they are given. */
  closeAttributes?: Attributes<Message>;
  /** Narrower (`size.maxWidth.cardNarrow`): confirms, settings, sign-in. */
  isNarrow?: boolean;
  /** The keys worth knowing while the card is open, printed first in its foot. */
  keyNotes?: Readonly<{ notes: readonly KeyNote[]; platform: KeyPlatform }>;
  /** The foot, a strip on the sunken ground: the key notes and `lead`, then these pushed
   *  right. The committing one is `Primary`. */
  actions?: ReadonlyArray<Html | string>;
  /** In the action bar before the push: a flash word, a quiet button. */
  lead?: ReadonlyArray<Html | string>;
  /** Attributes for the action bar, such as a Dialog's `actionBar` group, which moves focus
   *  between the actions with h, l and the side arrows. */
  actionBarAttributes?: Attributes<Message>;
}>;

type Parts<Message> = ViewConfig<Message> & Readonly<{ isCloseHeld?: boolean }>;

/** What a card's foot holds. */
export type Foot<Message> = Pick<
  ViewConfig<Message>,
  "keyNotes" | "actions" | "lead" | "actionBarAttributes"
>;

/** A card's foot, the strip on the sunken ground, or nothing when it would be empty. The
 *  command palette prints its own with it. */
export const footView = <Message>(
  config: Foot<Message>,
  h: HtmlBuilder<Message>
): readonly Html[] => {
  const {
    keyNotes,
    actions = [],
    lead = [],
    actionBarAttributes = [],
  } = config;

  return Array.match(
    [
      ...(keyNotes === undefined
        ? []
        : slotView(
            "p",
            "gg-card-keys",
            notesView(keyNotes.notes, keyNotes.platform, h),
            h
          )),
      ...lead,
      ...slotView("span", "gg-card-acts", actions, h),
    ],
    {
      onEmpty: () => [],
      onNonEmpty: (bar) => [
        h.div([...actionBarAttributes, h.Class("gg-card-actions")], bar),
      ],
    }
  );
};

const titleBarView = <Message>(
  title: string,
  config: Parts<Message>,
  h: HtmlBuilder<Message>
): Html => {
  const {
    titleAttributes = [],
    meta,
    closeAttributes,
    isCloseHeld = false,
  } = config;

  return h.header(
    [h.Class("gg-card-tb")],
    [
      h.h2(titleAttributes, [title]),
      ...(meta === undefined ? [] : [Text.meta([meta], h)]),
      ...(closeAttributes === undefined
        ? []
        : [
            IconButton.view(
              {
                glyph: "cross",
                label: "Close",
                isDisabled: isCloseHeld,
                attributes: isCloseHeld ? [] : closeAttributes,
              },
              h
            ),
          ]),
    ]
  );
};

const childrenView = <Message>(
  config: Parts<Message>,
  h: HtmlBuilder<Message>
): readonly Html[] => {
  const { title, head, body } = config;

  return [
    ...(title === undefined ? [] : [titleBarView(title, config, h)]),
    ...(head === undefined ? [] : [head]),
    h.div([h.Class("gg-card-body")], body),
    ...footView(config, h),
  ];
};

const className = (isNarrow: boolean | undefined): string =>
  isNarrow === true ? "gg-card gg-narrow" : "gg-card";

/** The floating surface: a rounded box on a soft shadow, under a title bar, over a sunken
 *  foot. In a Dialog it is the sheet. */
export const view = <Message>(
  config: ViewConfig<Message>,
  h: HtmlBuilder<Message>
): Html =>
  h.div([h.Class(className(config.isNarrow))], childrenView(config, h));

/** Configuration for rendering a form card with `formView`: a card's, but for its body, its
 *  close attributes and its actions, which the form fills. `lead` stays the card's: what
 *  goes before the push, such as a form's own delete. */
export type FormViewConfig<Message> = Omit<
  ViewConfig<Message>,
  "title" | "head" | "body" | "closeAttributes" | "actions"
> &
  Readonly<{
    /** The title, in the title bar; it names the form. */
    title: string;
    /** Unique in the document: the submit button's id is `submitId(id)`. */
    id: string;
    /** The form's content, fields and all, in one Fields group that `isBusy` holds. A link in
     *  it (an ErrorSummary's) stays live. */
    body: ReadonlyArray<Html | string>;
    /** Above the fields, outside the group `isBusy` holds: what the page says about the form
     *  while it is open (a lost connection with its retry), whose controls stay live while it
     *  sends. */
    notices?: ReadonlyArray<Html | string>;
    /** The submit button's words. It prints primary, the card's default. */
    submit: string;
    /** The cancel button's words, before the submit. It closes through `closeAttributes`. */
    cancel?: string;
    /** Attributes for the close glyph and the cancel button, such as a Dialog's `closeButton`
     *  group, which closes it. The glyph prints when they are given. */
    closeAttributes?: Attributes<Message>;
    /** The form's work is running (it sends): the submit button is busy, the close glyph and
     *  cancel are held without `closeAttributes`, and the body is natively disabled, so
     *  nothing changes under the send and nothing sends twice. In a Dialog, pass the same state
     *  as `isCloseHeld` to its update, so Escape and the veil are held too. Enter in a field
     *  can submit before the fields are held, so the update still ignores `onSubmit` while
     *  busy. */
    isBusy?: boolean;
    /** The form cannot be sent yet (nothing to send): the submit button is held as a Button
     *  is, and the fields and cancel stay live. Enter in a field can still submit, so the
     *  update ignores `onSubmit` while it cannot be sent. */
    isSubmitDisabled?: boolean;
    /** Sent when the form submits, by its button or by Enter in a field. */
    onSubmit: Message;
  }>;

/** The id of a form card's submit button. A send disables the fields, so focus in one falls
 *  to the page: the form's update moves it here as it sends, with
 *  `Focus.Focus({ id: Card.submitId(id) })`. */
export const submitId = (id: string): string => `${id}-submit`;

/** A card that is a form, named by its title, so a form landmark: its notices, its body in
 *  one Fields group, then cancel and the primary submit button in the action bar. */
export const formView = <Message>(
  config: FormViewConfig<Message>,
  h: HtmlBuilder<Message>
): Html => {
  const {
    id,
    title,
    submit,
    cancel,
    closeAttributes,
    notices = [],
    isBusy = false,
    isSubmitDisabled = false,
    onSubmit,
  } = config;

  const cancelButton =
    cancel === undefined
      ? []
      : [
          Button.view(
            {
              label: cancel,
              isDisabled: isBusy,
              attributes: isBusy ? [] : (closeAttributes ?? []),
            },
            h
          ),
        ];

  const submitButton = Button.view(
    {
      label: submit,
      variant: "Primary",
      isBusy,
      isDisabled: isSubmitDisabled,
      type: "submit",
      attributes: [h.Id(submitId(id))],
    },
    h
  );

  return h.form(
    [
      h.Class(className(config.isNarrow)),
      h.AriaLabel(title),
      h.Novalidate(true),
      h.OnSubmit(onSubmit),
    ],
    childrenView(
      {
        ...config,
        body: [...notices, Fields.view({ body: config.body, isBusy }, h)],
        isCloseHeld: isBusy,
        actions: [...cancelButton, submitButton],
      },
      h
    )
  );
};
