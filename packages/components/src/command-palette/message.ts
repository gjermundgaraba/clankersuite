import { Schema } from "effect";
import { defineMessageUnion } from "foldkit/message";

import * as Dialog from "../dialog/dialog.ts";

const ShownPage = Schema.Option(Schema.String);

export const ShownRow = Schema.Struct({
  id: Schema.String,
  isHeld: Schema.Boolean,
  hasPage: Schema.Boolean,
});

export type ShownRow = typeof ShownRow.Type;

const RenderSnapshot = Schema.Struct({
  maybeShownPage: ShownPage,
  shownQuery: Schema.String,
  shownShift: Schema.Finite,
  rows: Schema.Array(ShownRow),
  maybeShownCursor: Schema.Option(Schema.String),
});

export type RenderSnapshot = typeof RenderSnapshot.Type;

export const ArrowKey = Schema.Literals(["ArrowUp", "ArrowDown"]);

export type ArrowKey = typeof ArrowKey.Type;

/** Union of all Messages a command palette can produce. */
export const Message = defineMessageUnion({
  GotDialogMessage: { message: Dialog.Message },
  UpdatedQuery: { value: Schema.String, maybeShownPage: ShownPage },
  PressedArrowKey: { key: ArrowKey, snapshot: RenderSnapshot },
  PressedEarlyArrowKey: { key: ArrowKey },
  CompletedReportPendingKeys: {
    renderGeneration: Schema.Int,
    maybeRow: Schema.Option(ShownRow),
  },
  PressedEnter: { snapshot: RenderSnapshot },
  PressedEarlyEnter: {},
  PressedBackspace: { maybeShownPage: ShownPage },
  ClickedRow: { row: ShownRow, maybeShownPage: ShownPage },
  ClickedBack: {},
  CompletedScrollToCursor: {},
  CompletedFocus: {},
});

export type Message = typeof Message.Type;
