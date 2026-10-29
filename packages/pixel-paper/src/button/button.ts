import { Button as UiButton } from "@foldkit/ui";
import { Option, Schema } from "effect";
import type { KeySequence } from "foldkit/dom";
import type { Attribute, Html, HtmlBuilder } from "foldkit/html";

import type { Attributes } from "../attributes/attributes.ts";
import * as Glyph from "../glyph/glyph.ts";
import type { GlyphName } from "../glyph/glyphs.ts";
import * as KeyHint from "../key-hint/key-hint.ts";
import type { KeyPlatform } from "../key-hint/key-label.ts";

/** How a button prints. `Primary` is the one committing action. `Danger` is the commit inside a
 *  confirm, never at rest: a destructive action is a neutral button that opens a danger
 *  `ConfirmDialog`. */
export const Variant = Schema.Literals(["Default", "Primary", "Danger"]);

export type Variant = typeof Variant.Type;

/** What `Button` and `LinkButton` share: the variant, the size, and the default ring. */
export type Look = Readonly<{
  variant?: Variant;
  isSmall?: boolean;
  /** The action Enter takes in a card: a double ring instead of the print shadow. */
  isDefault?: boolean;
}>;

const VARIANT_CLASS: Readonly<Record<Variant, string>> = {
  Default: "btn",
  Primary: "btn primary",
  Danger: "btn danger",
};

export const lookClassName = ({
  variant = "Default",
  isSmall = false,
  isDefault = false,
}: Look): string =>
  `${VARIANT_CLASS[variant]}${isSmall ? " small" : ""}${isDefault ? " default-ring" : ""}`;

/** A button that can end done: it prints in ink, flat and unavailable, with the check in its
 *  glyph's place. Both words print in one cell, the other hidden, so the button is as wide as
 *  the longer word and never changes width. */
export type Done = Readonly<{
  isDone: boolean;
  /** The word it says once done (`"sent"`). */
  label: string;
}>;

/** The key that does the same as the button, printed small after its words. */
export type KeyHintConfig = Readonly<{
  keys: KeySequence;
  platform: KeyPlatform;
}>;

/** `aria-pressed` for a toggle button, always present so the button reads as a toggle in
 *  both states. Shared by every pressable in the system. */
export const pressedAttribute = <Message>(
  isPressed: boolean,
  h: HtmlBuilder<Message>
): Attribute<Message> => h.AriaPressed(isPressed ? "true" : "false");

/** Configuration for rendering a button with `view`. */
export type ViewConfig<Message> = Look &
  Readonly<{
    label: string;
    onClick?: Message;
    /** Working: a blinking block cursor prints in the right padding, so the label stays put
     *  and the button keeps its width. The button is held and says so (`aria-busy`). */
    isBusy?: boolean;
    /** Unavailable: the button is held. As in `@foldkit/ui`, it stays focusable
     *  (`aria-disabled`), so focus never falls to the page and Tab still finds it. */
    isDisabled?: boolean;
    keyHint?: KeyHintConfig;
    /** `submit` makes it its form's submit button while it is not held. */
    type?: "button" | "submit";
    /** Further attributes for the `<button>`, such as an id or a Submodel's attribute group. */
    attributes?: Attributes<Message>;
  }> &
  (
    | Readonly<{ glyph?: GlyphName; done?: undefined }>
    | Readonly<{ glyph: GlyphName; done: Done }>
  );

const wordsView = <Message>(
  label: string,
  maybeDone: Option.Option<Done>,
  h: HtmlBuilder<Message>
): Html | string =>
  Option.match(maybeDone, {
    onNone: () => label,
    onSome: ({ isDone, label: doneLabel }) =>
      h.span(
        [h.Class("btn-words")],
        [
          h.span(isDone ? [h.AriaHidden(true)] : [], [label]),
          h.span(isDone ? [] : [h.AriaHidden(true)], [doneLabel]),
        ]
      ),
  });

/**
 * The printed button: pixel caps in a 2px ink box on a 3px print shadow, built on
 * `@foldkit/ui`'s `Button`. It is held while busy, done or disabled: it prints unavailable
 * (`aria-disabled`), has no click handler, keeps its place in the keyboard, and renders as
 * `type="button"` so a held submit button submits nothing, by click or by Enter on itself.
 * While busy it is `aria-busy` too.
 *
 * Enter in a field can still submit a form that has no live submit button, so the form's
 * own update must ignore a submit while its work is saving (see `Card.formView`).
 */
export const view = <Message>(
  config: ViewConfig<Message>,
  h: HtmlBuilder<Message>
): Html => {
  const {
    label,
    onClick,
    isBusy = false,
    isDisabled = false,
    type = "button",
    attributes = [],
    glyph,
  } = config;

  const maybeDone = Option.fromNullishOr(config.done);
  const isDone = Option.exists(maybeDone, (done) => done.isDone);
  const isHeld = isBusy || isDone || isDisabled;
  const isWorking = isBusy && !isDone;

  const lookClass = isDone
    ? `${lookClassName({ isSmall: config.isSmall ?? false })} done`
    : lookClassName(config);

  const glyphName = isDone ? "check" : glyph;
  const keyHint = isDone ? undefined : config.keyHint;

  return UiButton.view(
    {
      type: isHeld ? "button" : type,
      isDisabled: isHeld,
      ...(onClick !== undefined && { onClick }),
      toView: (groups) =>
        h.button(
          [
            ...attributes,
            ...groups.button,
            ...(isWorking ? [h.AriaBusy(true)] : []),
            h.Class(lookClass),
          ],
          [
            ...(glyphName === undefined
              ? []
              : [Glyph.view({ name: glyphName }, h)]),
            wordsView(label, maybeDone, h),
            ...(keyHint === undefined ? [] : [KeyHint.view(keyHint, h)]),
            ...(isWorking
              ? [h.span([h.Class("cursor"), h.AriaHidden(true)])]
              : []),
          ]
        ),
    },
    h
  );
};
