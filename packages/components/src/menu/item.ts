import { Data } from "effect";

import type { KeyHintConfig } from "../button/button.ts";

/** One entry in a menu. Build them with `action`, `radio`, `check`, `link` and `group`. */
export type Item = Data.TaggedEnum<{
  /** An action (`role="menuitem"`): choosing it reports `Selected` with its id and closes the
   *  slip. */
  Action: {
    readonly id: string;
    readonly label: string;
    /** The key that does the same, printed at the right. */
    readonly keyHint?: KeyHintConfig;
    /** Visible but not possible now (`aria-disabled`): it prints muted, the arrows still stop
     *  on it (the ARIA menu pattern), and choosing it does nothing. */
    readonly isDisabled?: boolean;
  };
  /** One choice among its siblings (`role="menuitemradio"`, `aria-checked`): a palette, an
   *  area, a layout. The checked one prints inverted. Choosing it reports `Selected` and
   *  closes the slip; the parent moves the check. Put a set of them in a `group`. */
  Radio: {
    readonly id: string;
    readonly label: string;
    readonly isChecked: boolean;
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
  };
  /** Items under a heading (`role="group"`, named by the heading): `"Appearance"` over the
   *  palettes, `"Account"` over sign out. A set of radio items belongs in one. The label is
   *  the group's identity in its slip: two groups there do not share one. */
  Group: { readonly label: string; readonly items: readonly Entry[] };
}>;

/** One row of a menu or of a group: any item but a group. */
export type Entry = Exclude<Item, { readonly _tag: "Group" }>;

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

/** A group of items under a heading; see `Item`'s `Group`. */
export const group = (label: string, items: readonly Entry[]): Item =>
  Item.Group({ label, items });
