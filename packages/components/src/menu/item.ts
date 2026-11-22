import type { GlyphName } from "@gjermundgaraba/icons";
import { Data } from "effect";

import type { KeyHintConfig } from "../button/button.ts";

/** One entry in a menu. Build them with `action`, `radio`, `check`, `link`, `day`, `group`
 *  and `separator`. An action, radio, link or day item can lead with a `glyph` and end in a
 *  quiet `hint`, such as the date a choice means. */
export type Item = Data.TaggedEnum<{
  /** An action (`role="menuitem"`): choosing it reports `Selected` with its id and closes the
   *  slip. */
  Action: {
    readonly id: string;
    readonly label: string;
    readonly glyph?: GlyphName;
    readonly hint?: string;
    /** The key that does the same, printed at the right. */
    readonly keyHint?: KeyHintConfig;
    /** Visible but not possible now (`aria-disabled`): it prints muted, the arrows still stop
     *  on it (the ARIA menu pattern), and choosing it does nothing. */
    readonly isDisabled?: boolean;
  };
  /** One choice among its siblings (`role="menuitemradio"`, `aria-checked`): a palette, an
   *  area, a layout. The checked one prints in the accent with a check at its end, in place
   *  of its hint. Choosing it reports `Selected` and closes the slip; the parent moves the
   *  check. Put a set of them in a `group`, or among separators. */
  Radio: {
    readonly id: string;
    readonly label: string;
    readonly isChecked: boolean;
    readonly glyph?: GlyphName;
    readonly hint?: string;
  };
  /** A setting that toggles (`role="menuitemcheckbox"`, `aria-checked`): choosing it reports
   *  `Toggled` and keeps the slip open; the parent flips the value it keeps. */
  Check: {
    readonly id: string;
    readonly label: string;
    readonly isChecked: boolean;
  };
  /** A place to go: a real link (`<a role="menuitem">`), so a new tab can open it. Choosing it
   *  follows the link, closes the slip and reports `Selected`. */
  Link: {
    readonly id: string;
    readonly label: string;
    readonly href: string;
    readonly glyph?: GlyphName;
    readonly hint?: string;
  };
  /** A day to pick (`role="menuitem"`, `aria-haspopup="dialog"`): choosing it closes the slip,
   *  puts focus back on the toggle and opens the browser's date picker over a hidden date input
   *  beside the toggle, which is on the page while the slip is open and stays after it closes
   *  until a day is picked or the menu opens again. The day picked comes back as `PickedDay` with
   *  the item's id, focus on the toggle again; a picker dismissed reports nothing. When the
   *  update that takes the day removes the toggle (the row it sat on moves away), the
   *  application places focus. */
  Day: {
    readonly id: string;
    readonly label: string;
    /** The day the picker opens on, as `YYYY-MM-DD`, or `""` for none. */
    readonly value: string;
    readonly glyph?: GlyphName;
    readonly hint?: string;
  };
  /** Items under a heading (`role="group"`, named by the heading): `"Appearance"` over the
   *  palettes, `"Account"` over sign out. A set of radio items belongs in one. The label is
   *  the group's identity in its slip: two groups there do not share one. The heading prints
   *  as a quiet label row. */
  Group: { readonly label: string; readonly items: readonly Entry[] };
  /** A rule between items (`role="separator"`), which the arrows pass over. Its id keys it
   *  among the rows. */
  Separator: { readonly id: string };
}>;

export type Entry = Exclude<Item, { readonly _tag: "Group" | "Separator" }>;

/** The constructors, guards (`$is`) and matcher (`$match`) of `Item`. */
export const Item = Data.taggedEnum<Item>();

/** An action item; see `Item`'s `Action`. */
export const action = (config: Data.TaggedEnum.Args<Item, "Action">): Entry =>
  Item.Action(config);

/** A radio item; see `Item`'s `Radio`. */
export const radio = (config: Data.TaggedEnum.Args<Item, "Radio">): Entry =>
  Item.Radio(config);

/** A check item; see `Item`'s `Check`. */
export const check = (config: Data.TaggedEnum.Args<Item, "Check">): Entry =>
  Item.Check(config);

/** A link item; see `Item`'s `Link`. */
export const link = (config: Data.TaggedEnum.Args<Item, "Link">): Entry =>
  Item.Link(config);

/** A day item; see `Item`'s `Day`. */
export const day = (config: Data.TaggedEnum.Args<Item, "Day">): Entry =>
  Item.Day(config);

/** A group of items under a heading; see `Item`'s `Group`. */
export const group = (label: string, items: readonly Entry[]): Item =>
  Item.Group({ label, items });

/** A rule between items; see `Item`'s `Separator`. */
export const separator = (id: string): Item => Item.Separator({ id });
