import { Schema } from "effect";
import { defineMessageUnion } from "foldkit/message";

/** What a chosen row is: which role it plays, so the menu knows whether it closes. */
export const ChoiceKind = Schema.Literals(["Action", "Radio", "Check", "Link"]);

export type ChoiceKind = typeof ChoiceKind.Type;

/** Where focus lands as the slip opens: its first row, or (↑ on the toggle) its last. */
export const Edge = Schema.Literals(["First", "Last"]);

export type Edge = typeof Edge.Type;

/** Union of all Messages a menu can produce. `BlurredSlip` (focus went outside the slip),
 *  `UnmountedSlip` (the slip left the page) and `CompletedFocus` (focus is back on the
 *  toggle) can arrive after the menu has closed. Each must reach the Model of the menu that
 *  sent it, where a late one changes nothing: given to another menu's Model, a late `BlurredSlip`
 *  or `UnmountedSlip` closes that one. */
export const Message = defineMessageUnion({
  ClickedToggle: {},
  PressedToggleArrow: { edge: Edge },
  SelectedItem: { id: Schema.String, kind: ChoiceKind },
  PressedEscape: {},
  PressedTab: {},
  BlurredSlip: {},
  UnmountedSlip: {},
  CompletedPlaceSlip: {},
  CompletedFocus: {},
  CompletedFocusEdge: {},
});

export type Message = typeof Message.Type;
