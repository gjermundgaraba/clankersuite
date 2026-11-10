import { Schema } from "effect";
import { defineMessageUnion } from "foldkit/message";

import { Lift } from "../drag/drag.ts";
import { Splitter, Step, Target } from "./layout.ts";

export const PointerAt = Schema.Struct({
  clientX: Schema.Finite,
  clientY: Schema.Finite,
  maybeTarget: Schema.Option(Target),
});

export type PointerAt = typeof PointerAt.Type;

/** Union of all Messages a reel can produce. */
export const Message = defineMessageUnion({
  PressedGrip: {
    paneId: Schema.String,
    pointerId: Schema.Finite,
    clientX: Schema.Finite,
    clientY: Schema.Finite,
    lift: Lift,
  },
  PressedGripKey: { paneId: Schema.String },
  MovedPointer: PointerAt.fields,
  ReleasedPointer: PointerAt.fields,
  CancelledPointer: {},
  PressedHeldArrowKey: { step: Step },
  PressedHeldDropKey: {},
  BlurredGrip: {},
  PressedEscape: {},
  FocusedPane: { paneId: Schema.String },
  ClickedTab: { paneId: Schema.String },
  PressedTabArrowKey: { paneId: Schema.String },
  PressedSplitter: {
    splitter: Splitter,
    pointerId: Schema.Finite,
    clientX: Schema.Finite,
    clientY: Schema.Finite,
  },
  MovedSplitter: { share: Schema.Finite },
  ReleasedSplitter: { share: Schema.Finite },
  CancelledSplitter: {},
  PressedSplitterKey: { splitter: Splitter, share: Schema.Finite },
  CompletedAnnounceReel: {},
  CompletedFocusPane: {},
  CompletedFocusTab: {},
  CompletedRestoreFocus: {},
  CompletedScrollIntoView: {},
});

export type Message = typeof Message.Type;
