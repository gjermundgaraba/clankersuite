import { Array, Number, Option, Schema } from "effect";
import { Scene, Story } from "foldkit";
import * as Command from "foldkit/command";
import type { HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";
import * as FoldkitSubscription from "foldkit/subscription";
import * as FoldkitUpdate from "foldkit/update";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { htmlElement } from "../dom/html-element.ts";
import { disposeEmbedded, embed } from "../test/embed.ts";
import { keydown } from "../test/events.ts";
import { byId, bySelector } from "../test/fixture.ts";
import { settle, settleUntil } from "../test/settle.ts";
import * as Window from "../window/window.ts";
import * as ReelLayout from "./layout.ts";
import * as Reel from "./reel.ts";

const pane = (id: string, label: string, weight = 1): ReelLayout.Pane => ({
  id,
  label,
  weight,
});

const LAYOUT: ReelLayout.Layout = [
  {
    id: "c1",
    width: 1 / 2,
    panes: [pane("shell", "Shell"), pane("notes", "Notes")],
  },
  { id: "c2", width: 2 / 3, panes: [pane("diff", "Diff")] },
  { id: "c3", width: 1 / 2, panes: [pane("canvas", "Canvas")] },
];

const { MovedPane, PulledOutPane, MovedColumn, ResizedColumn, ResizedPanes } =
  ReelLayout.OutMessage;

const fresh = Reel.init({ id: "work" });

const reelUpdate =
  (layout: ReelLayout.Layout) => (model: Reel.Model, message: Reel.Message) =>
    Reel.update(model, message, { layout });

describe("Reel focus", () => {
  it("starts on the first pane, and finds the nearest pane when the focused one goes", () => {
    expect(Reel.focusedPaneId(fresh, LAYOUT)).toStrictEqual(
      Option.some("shell")
    );

    const onNotes = reelUpdate(LAYOUT)(
      fresh,
      Reel.Message.FocusedPane({ paneId: "notes" })
    ).model;

    expect(Reel.focusedPaneId(onNotes, LAYOUT)).toStrictEqual(
      Option.some("notes")
    );
    expect(
      Reel.focusedPaneId(onNotes, [
        { id: "c1", width: 1 / 2, panes: [pane("shell", "Shell")] },
      ])
    ).toStrictEqual(Option.some("shell"));
    expect(Reel.focusedPaneId(onNotes, [])).toStrictEqual(Option.none());
  });

  it("reads the focused pane's place again from a changed layout, so its neighbour is found after a move", () => {
    const onNotes = reelUpdate(LAYOUT)(
      fresh,
      Reel.Message.FocusedPane({ paneId: "notes" })
    ).model;

    const moved = ReelLayout.apply(
      LAYOUT,
      MovedPane({ paneId: "notes", toColumnId: "c3", toIndex: 1 })
    );

    const seen = Reel.reconcile(onNotes, { layout: moved }).model;

    expect(
      Reel.focusedPaneId(
        seen,
        ReelLayout.apply(
          moved,
          MovedPane({ paneId: "notes", toColumnId: "c3", toIndex: 0 })
        )
      )
    ).toStrictEqual(Option.some("notes"));
    expect(
      Reel.focusedPaneId(seen, [
        { id: "c1", width: 1 / 2, panes: [pane("shell", "Shell")] },
        { id: "c2", width: 2 / 3, panes: [pane("diff", "Diff")] },
        { id: "c3", width: 1 / 2, panes: [pane("canvas", "Canvas")] },
      ])
    ).toStrictEqual(Option.some("canvas"));
  });
});

const Harness = defineMessageUnion({
  Pressed: { action: Reel.Action },
  Got: { message: Reel.Message },
  Reconciled: {},
});

type Harness = typeof Harness.Type;

const harness =
  (layout: ReelLayout.Layout, arrangement: Reel.Arrangement = "Strip") =>
  (
    model: Reel.Model,
    message: Harness
  ): FoldkitUpdate.ReturnWithOutMessage<
    Reel.Model,
    Harness,
    ReelLayout.OutMessage
  > => {
    const reelReturn = Harness.match(message, {
      Pressed: ({ action }) =>
        Reel.perform(model, action, { layout, arrangement }),
      Got: ({ message: reelMessage }) =>
        Reel.update(model, reelMessage, { layout }),
      Reconciled: () => Reel.reconcile(model, { layout }),
    });

    return {
      model: reelReturn.model,
      commands: Command.mapMessages(reelReturn.commands, (reelMessage) =>
        Harness.Got({ message: reelMessage })
      ),
      ...(reelReturn.outMessage === undefined
        ? {}
        : { outMessage: reelReturn.outMessage }),
    };
  };

const announce = (text: string) =>
  Story.Command.resolve(
    Reel.AnnounceReel({ text }),
    Reel.Message.CompletedAnnounceReel()
  );

const scrollTo = (hook: string) =>
  Story.Command.resolve(
    Reel.ScrollIntoView({ hook: `work/${hook}` }),
    Reel.Message.CompletedScrollIntoView()
  );

const focusPane = (paneId: string) =>
  Story.Command.resolve(
    Reel.FocusPane({ paneHook: `work/pane/${paneId}` }),
    Reel.Message.CompletedFocusPane()
  );

const performOn = (model: Reel.Model, action: Reel.Action, layout = LAYOUT) =>
  Reel.perform(model, action, { layout }).outMessage;

describe("Reel.perform", () => {
  it("focuses the pane beside the focused one, scrolls to it and says where it is", () => {
    Story.story(
      harness(LAYOUT),
      Story.given(fresh),
      Story.message(Harness.Pressed({ action: "FocusRight" })),
      Story.expectNoOutMessage(),
      focusPane("diff"),
      scrollTo("pane/diff"),
      announce("Diff, column 2 of 3."),
      Story.message(Harness.Pressed({ action: "FocusLeft" })),
      focusPane("shell"),
      scrollTo("pane/shell"),
      announce("Shell, 1 of 2 in column 1 of 3."),
      Story.message(Harness.Pressed({ action: "FocusDown" })),
      focusPane("notes"),
      scrollTo("pane/notes"),
      announce("Notes, 2 of 2 in column 1 of 3."),
      Story.message(Harness.Pressed({ action: "FocusDown" })),
      Story.Command.expectNone(),
      Story.model((model) => {
        expect(Reel.focusedPaneId(model, LAYOUT)).toStrictEqual(
          Option.some("notes")
        );
      })
    );
  });

  it("asks to move the focused pane into the next column, and says where it lands", () => {
    Story.story(
      harness(LAYOUT),
      Story.given(fresh),
      Story.message(Harness.Pressed({ action: "MovePaneRight" })),
      Story.expectOutMessage(
        MovedPane({ paneId: "shell", toColumnId: "c2", toIndex: 0 })
      ),
      scrollTo("pane/shell"),
      announce("Shell moved to 1 of 2 in column 2 of 3.")
    );
  });

  it("pulls the pane out past the first column, and moves a lone pane into its neighbour", () => {
    const onDiff = reelUpdate(LAYOUT)(
      fresh,
      Reel.Message.FocusedPane({ paneId: "diff" })
    ).model;

    expect(performOn(fresh, "MovePaneLeft")).toStrictEqual(
      PulledOutPane({ paneId: "shell", maybeBeforeColumnId: Option.some("c1") })
    );
    expect(performOn(onDiff, "MovePaneLeft")).toStrictEqual(
      MovedPane({ paneId: "diff", toColumnId: "c1", toIndex: 0 })
    );
    expect(
      performOn(onDiff, "MovePaneLeft", [
        { id: "c2", width: 1, panes: [pane("diff", "Diff")] },
      ])
    ).toBeUndefined();
  });

  it("asks nothing to move a pane alone in its column up or down it", () => {
    const onDiff = reelUpdate(LAYOUT)(
      fresh,
      Reel.Message.FocusedPane({ paneId: "diff" })
    ).model;

    expect(performOn(onDiff, "MovePaneUp")).toBeUndefined();
    expect(performOn(onDiff, "MovePaneDown")).toBeUndefined();
  });

  it("moves the pane within its column, pulls it out to the right, and stops at the ends", () => {
    expect(performOn(fresh, "MovePaneDown")).toStrictEqual(
      MovedPane({ paneId: "shell", toColumnId: "c1", toIndex: 1 })
    );
    expect(performOn(fresh, "MovePaneUp")).toBeUndefined();
    expect(performOn(fresh, "PullOut")).toStrictEqual(
      PulledOutPane({ paneId: "shell", maybeBeforeColumnId: Option.some("c2") })
    );
  });

  it("moves the focused pane's column and says where the column went", () => {
    Story.story(
      harness(LAYOUT),
      Story.given(fresh),
      Story.message(Harness.Pressed({ action: "MoveColumnRight" })),
      Story.expectOutMessage(
        MovedColumn({ columnId: "c1", maybeBeforeColumnId: Option.some("c3") })
      ),
      scrollTo("pane/shell"),
      announce("Column with Shell moved to column 2 of 3."),
      Story.message(Harness.Pressed({ action: "MoveColumnLeft" })),
      Story.Command.expectNone()
    );
  });

  it("cycles the column's width through the presets, past the last back to the first", () => {
    Story.story(
      harness(LAYOUT),
      Story.given(fresh),
      Story.message(Harness.Pressed({ action: "CycleWidth" })),
      Story.expectOutMessage(ResizedColumn({ columnId: "c1", width: 2 / 3 })),
      scrollTo("pane/shell"),
      announce("Column 1 takes two thirds of the width.")
    );

    expect(
      performOn(fresh, "CycleWidth", [
        { id: "c1", width: 1, panes: [pane("shell", "Shell")] },
      ])
    ).toStrictEqual(ResizedColumn({ columnId: "c1", width: 1 / 3 }));
    expect(
      performOn(fresh, "CycleWidth", [
        { id: "c1", width: 0.4, panes: [pane("shell", "Shell")] },
      ])
    ).toStrictEqual(ResizedColumn({ columnId: "c1", width: 1 / 2 }));
  });

  it("does nothing while a pane is held", () => {
    const held = reelUpdate(LAYOUT)(
      fresh,
      Reel.Message.PressedGripKey({ paneId: "diff" })
    ).model;

    expect(
      Reel.perform(held, "FocusRight", { layout: LAYOUT }).commands ?? []
    ).toStrictEqual([]);
  });
});

const restoreFocus = (paneId: string) =>
  Story.Command.resolve(
    Reel.RestoreFocus({ paneHook: `work/pane/${paneId}` }),
    Reel.Message.CompletedRestoreFocus()
  );

describe("Reel.perform under tabs", () => {
  it("steps the focus keys through the tabs in reading order, says which tab, and stops at either end", () => {
    Story.story(
      harness(LAYOUT, "Tabs"),
      Story.given(fresh),
      Story.message(Harness.Pressed({ action: "FocusLeft" })),
      Story.Command.expectNone(),
      Story.message(Harness.Pressed({ action: "FocusRight" })),
      Story.expectNoOutMessage(),
      focusPane("notes"),
      announce("Notes, tab 2 of 4."),
      Story.message(Harness.Pressed({ action: "FocusDown" })),
      focusPane("diff"),
      announce("Diff, tab 3 of 4."),
      Story.message(Harness.Pressed({ action: "FocusRight" })),
      focusPane("canvas"),
      announce("Canvas, tab 4 of 4."),
      Story.message(Harness.Pressed({ action: "FocusRight" })),
      Story.Command.expectNone(),
      Story.message(Harness.Pressed({ action: "FocusUp" })),
      focusPane("diff"),
      announce("Diff, tab 3 of 4."),
      Story.model((model) => {
        expect(Reel.focusedPaneId(model, LAYOUT)).toStrictEqual(
          Option.some("diff")
        );
      })
    );
  });

  it("moves and sizes nothing, since a tab has no column to move or size", () => {
    const onNotes = reelUpdate(LAYOUT)(
      fresh,
      Reel.Message.FocusedPane({ paneId: "notes" })
    ).model;

    const moves: readonly Reel.Action[] = [
      "MovePaneLeft",
      "MovePaneRight",
      "MovePaneUp",
      "MovePaneDown",
      "MoveColumnLeft",
      "MoveColumnRight",
      "CycleWidth",
      "PullOut",
    ];

    for (const action of moves) {
      const performed = Reel.perform(onNotes, action, {
        layout: LAYOUT,
        arrangement: "Tabs",
      });

      expect(performed.outMessage).toBeUndefined();
      expect(performed.commands ?? []).toStrictEqual([]);
      expect(performed.model).toStrictEqual(onNotes);
    }
  });
});

const NOTES = "notes";

const step = (by: ReelLayout.Step) => Reel.Message.SteppedHeld({ step: by });

const drop = Reel.Message.DroppedHeld();

const SHELL_SPLIT = { _tag: "Split", abovePaneId: "shell" } as const;

const pressSplitter = (
  splitter: typeof SHELL_SPLIT | { _tag: "Width"; columnId: string }
) =>
  Reel.Message.PressedSplitter({
    splitter,
    pointerId: 1,
    clientX: 100,
    clientY: 100,
  });

const into = (columnId: string, index: number) =>
  ({ _tag: "Into", columnId, index }) as const;

const gap = (before: string | undefined) =>
  ({ _tag: "Gap", maybeBeforeColumnId: Option.fromNullishOr(before) }) as const;

const pointer = (
  tag: "MovedPointer" | "ReleasedPointer",
  maybeTarget: Option.Option<ReturnType<typeof into> | ReturnType<typeof gap>>,
  x = 400
) => Reel.Message[tag]({ clientX: x, clientY: 100, maybeTarget });

const press = (paneId: string) =>
  Reel.Message.PressedGrip({
    paneId,
    pointerId: 1,
    clientX: 100,
    clientY: 100,
  });

const isHolding = (model: Reel.Model): boolean =>
  Option.isSome(model.maybeHeld);

describe("Reel.reconcile", () => {
  it("finds the focused pane's neighbour where it is now, after another client moved it, and gives it the keyboard", () => {
    const onDiff = reelUpdate(LAYOUT)(
      fresh,
      Reel.Message.FocusedPane({ paneId: "diff" })
    ).model;

    const diffFirst = ReelLayout.apply(
      LAYOUT,
      MovedColumn({ columnId: "c2", maybeBeforeColumnId: Option.some("c1") })
    );

    const closed = Array.filter(diffFirst, ({ id }) => id !== "c2");

    Story.story(
      harness(diffFirst),
      Story.given(onDiff),
      Story.message(Harness.Reconciled()),
      Story.Command.expectNone()
    );
    Story.story(
      harness(closed),
      Story.given(Reel.reconcile(onDiff, { layout: diffFirst }).model),
      Story.message(Harness.Reconciled()),
      restoreFocus("shell"),
      Story.model((model) => {
        expect(Reel.focusedPaneId(model, closed)).toStrictEqual(
          Option.some("shell")
        );
      })
    );
  });

  it("cancels a drag whose pane leaves the layout", () => {
    const held = reelUpdate(LAYOUT)(
      fresh,
      Reel.Message.PressedGripKey({ paneId: NOTES })
    ).model;

    Story.story(
      harness([{ id: "c1", width: 1, panes: [pane("shell", "Shell")] }]),
      Story.given(held),
      Story.message(Harness.Reconciled()),
      Story.expectNoOutMessage(),
      announce("Move cancelled."),
      Story.model((model) => {
        expect(isHolding(model)).toBe(false);
      })
    );
  });

  it("aims a held pane where it started when the column it was over goes, so the arrows go on", () => {
    const lifted = reelUpdate(LAYOUT)(
      fresh,
      Reel.Message.PressedGripKey({ paneId: NOTES })
    ).model;

    const overDiff = reelUpdate(LAYOUT)(
      reelUpdate(LAYOUT)(lifted, step("Right")).model,
      step("Right")
    ).model;

    const withoutDiff = Array.filter(LAYOUT, ({ id }) => id !== "c2");

    Story.story(
      harness(withoutDiff),
      Story.given(overDiff),
      Story.message(Harness.Reconciled()),
      Story.model((model) => {
        expect(
          Option.flatMap(model.maybeHeld, ({ maybeTarget }) => maybeTarget)
        ).toStrictEqual(Option.some(into("c1", 1)));
      }),
      Story.message(Harness.Got({ message: step("Right") })),
      announce("Notes, column 2 of 3."),
      scrollTo("column/c3")
    );
  });

  it("lets go of a splitter whose panes are no longer beside each other", () => {
    const resizing = reelUpdate(LAYOUT)(
      fresh,
      pressSplitter(SHELL_SPLIT)
    ).model;

    expect(
      Reel.reconcile(resizing, {
        layout: ReelLayout.apply(
          LAYOUT,
          MovedPane({ paneId: "shell", toColumnId: "c1", toIndex: 1 })
        ),
      }).model.maybeResizing
    ).toStrictEqual(Option.none());
    expect(
      Reel.reconcile(resizing, { layout: LAYOUT }).model.maybeResizing
    ).not.toStrictEqual(Option.none());
  });
});

describe("Reel keyboard drag", () => {
  it("picks a pane up, steps it through a gap into the next column and down it, and drops it", () => {
    Story.story(
      reelUpdate(LAYOUT),
      Story.given(fresh),
      Story.message(Reel.Message.PressedGripKey({ paneId: NOTES })),
      announce(
        "Picked up Notes. Arrow keys move it, space drops it, escape or tab puts it back."
      ),
      Story.message(step("Right")),
      announce("Notes, column 2 of 4."),
      scrollTo("column/c2"),
      Story.message(step("Right")),
      announce("Notes, 1 of 2 in column 2 of 3."),
      scrollTo("column/c2"),
      Story.message(step("Down")),
      announce("Notes, 2 of 2 in column 2 of 3."),
      scrollTo("column/c2"),
      Story.message(drop),
      Story.expectOutMessage(
        MovedPane({ paneId: "notes", toColumnId: "c2", toIndex: 1 })
      ),
      announce("Notes dropped at 2 of 2 in column 2 of 3."),
      Story.model((model) => {
        expect(isHolding(model)).toBe(false);
      })
    );
  });

  it("puts a lone pane back when it is dropped where it was", () => {
    Story.story(
      reelUpdate(LAYOUT),
      Story.given(fresh),
      Story.message(Reel.Message.PressedGripKey({ paneId: "diff" })),
      announce(
        "Picked up Diff. Arrow keys move it, space drops it, escape or tab puts it back."
      ),
      Story.message(drop),
      Story.expectNoOutMessage(),
      announce("Diff put back where it was.")
    );
  });

  it("puts the pane back on Escape, or when focus leaves its grip", () => {
    Story.story(
      reelUpdate(LAYOUT),
      Story.given(fresh),
      Story.message(Reel.Message.PressedGripKey({ paneId: NOTES })),
      announce(
        "Picked up Notes. Arrow keys move it, space drops it, escape or tab puts it back."
      ),
      Story.message(step("Right")),
      announce("Notes, column 2 of 4."),
      scrollTo("column/c2"),
      Story.message(Reel.Message.PressedEscape()),
      Story.expectNoOutMessage(),
      announce("Move cancelled. Notes put back where it was."),
      Story.message(Reel.Message.PressedGripKey({ paneId: NOTES })),
      announce(
        "Picked up Notes. Arrow keys move it, space drops it, escape or tab puts it back."
      ),
      Story.message(step("Right")),
      announce("Notes, column 2 of 4."),
      scrollTo("column/c2"),
      Story.message(Reel.Message.LeftGrip()),
      Story.expectNoOutMessage(),
      announce("Move cancelled. Notes put back where it was.")
    );
  });
});

describe("Reel pointer drag", () => {
  it("carries a pane once the pointer moves past the threshold, and drops it in a new column", () => {
    Story.story(
      reelUpdate(LAYOUT),
      Story.given(fresh),
      Story.message(press(NOTES)),
      Story.message(pointer("MovedPointer", Option.some(into("c2", 0)), 103)),
      Story.Command.expectNone(),
      Story.model((model) => {
        expect(isHolding(model)).toBe(true);
      }),
      Story.message(pointer("MovedPointer", Option.some(into("c2", 0)))),
      announce("Picked up Notes."),
      Story.message(pointer("ReleasedPointer", Option.some(gap(undefined)))),
      Story.expectOutMessage(
        PulledOutPane({ paneId: "notes", maybeBeforeColumnId: Option.none() })
      ),
      announce("Notes dropped at column 4 of 4."),
      Story.model((model) => {
        expect(isHolding(model)).toBe(false);
      })
    );
  });

  it("lets go of a press that never moved, and reports nothing for a drop where it was or outside", () => {
    Story.story(
      reelUpdate(LAYOUT),
      Story.given(fresh),
      Story.message(press(NOTES)),
      Story.message(
        pointer("ReleasedPointer", Option.some(gap(undefined)), 100)
      ),
      Story.expectNoOutMessage(),
      Story.Command.expectNone(),
      Story.message(press(NOTES)),
      Story.message(pointer("MovedPointer", Option.some(into("c1", 1)))),
      announce("Picked up Notes."),
      Story.message(pointer("ReleasedPointer", Option.some(into("c1", 1)))),
      Story.expectNoOutMessage(),
      announce("Notes put back where it was."),
      Story.message(press(NOTES)),
      Story.message(pointer("MovedPointer", Option.none())),
      announce("Picked up Notes."),
      Story.message(pointer("ReleasedPointer", Option.none())),
      Story.expectNoOutMessage(),
      announce("Notes put back where it was.")
    );
  });

  it("drops where it meant after the columns moved under it", () => {
    const held = reelUpdate(LAYOUT)(
      reelUpdate(LAYOUT)(fresh, press(NOTES)).model,
      pointer("MovedPointer", Option.some(into("c3", 0)))
    ).model;

    const reordered = ReelLayout.apply(
      LAYOUT,
      MovedColumn({ columnId: "c3", maybeBeforeColumnId: Option.some("c1") })
    );

    expect(
      reelUpdate(reordered)(held, Reel.Message.PressedEscape()).outMessage
    ).toBeUndefined();
    expect(
      reelUpdate(reordered)(
        held,
        pointer("ReleasedPointer", Option.some(into("c3", 0)))
      ).outMessage
    ).toStrictEqual(
      MovedPane({ paneId: "notes", toColumnId: "c3", toIndex: 0 })
    );
  });
});

describe("Reel keyboard drag after a change", () => {
  it("keeps its target by id when another client moves the columns", () => {
    const lifted = reelUpdate(LAYOUT)(
      fresh,
      Reel.Message.PressedGripKey({ paneId: NOTES })
    ).model;

    const overDiff = reelUpdate(LAYOUT)(
      reelUpdate(LAYOUT)(lifted, step("Right")).model,
      step("Right")
    ).model;

    const reordered = ReelLayout.apply(
      LAYOUT,
      MovedColumn({ columnId: "c2", maybeBeforeColumnId: Option.some("c1") })
    );

    expect(reelUpdate(reordered)(overDiff, drop).outMessage).toStrictEqual(
      MovedPane({ paneId: "notes", toColumnId: "c2", toIndex: 0 })
    );
  });
});

describe("Reel resize", () => {
  it("previews a dragged splitter's resize from the layout's sizes and asks for it when let go", () => {
    Story.story(
      reelUpdate(LAYOUT),
      Story.given(fresh),
      Story.message(pressSplitter({ _tag: "Width", columnId: "c2" })),
      Story.message(Reel.Message.MovedSplitter({ share: 0.1 })),
      Story.expectNoOutMessage(),
      Story.message(Reel.Message.ReleasedSplitter({ share: -0.1 })),
      Story.expectOutMessage(ResizedColumn({ columnId: "c2", width: 0.5667 })),
      Story.model((model) => {
        expect(model.maybeResizing).toStrictEqual(Option.none());
      }),
      Story.message(pressSplitter(SHELL_SPLIT)),
      Story.message(Reel.Message.ReleasedSplitter({ share: 0.25 })),
      Story.expectOutMessage(
        ResizedPanes({ columnId: "c1", weights: { shell: 1.5, notes: 0.5 } })
      )
    );
  });

  it("asks for nothing when the browser cancels a resize, or Escape puts it back", () => {
    Story.story(
      reelUpdate(LAYOUT),
      Story.given(fresh),
      Story.message(pressSplitter({ _tag: "Width", columnId: "c2" })),
      Story.message(Reel.Message.MovedSplitter({ share: 0.1 })),
      Story.message(Reel.Message.CancelledSplitter()),
      Story.expectNoOutMessage(),
      Story.message(pressSplitter({ _tag: "Width", columnId: "c2" })),
      Story.message(Reel.Message.PressedEscape()),
      Story.message(Reel.Message.ReleasedSplitter({ share: 0.1 })),
      Story.expectNoOutMessage(),
      Story.model((model) => {
        expect(model.maybeResizing).toStrictEqual(Option.none());
      })
    );
  });
});

const windowOf =
  <ParentMessage>(h: HtmlBuilder<ParentMessage>) =>
  (shown: ReelLayout.Pane, render: Reel.PaneRender) =>
    Window.view(
      {
        id: render.id,
        title: shown.label,
        lead: render.lead,
        glyph: "terminal",
        body: [h.p([h.Class("pane-text")], [`${shown.label} body`])],
      },
      h
    );

const reelView =
  (layout: ReelLayout.Layout, arrangement: Reel.Arrangement = "Strip") =>
  (model: Reel.Model, h: HtmlBuilder<Reel.Message>) =>
    Reel.view(
      model,
      { layout, label: "Task panes", toPaneView: windowOf(h), arrangement },
      h
    );

const sizeLifted = Scene.Mount.resolve(
  Reel.SizeLiftedPane,
  Reel.Message.CompletedSizeLiftedPane()
);

const reelScene = (
  model: Reel.Model,
  ...steps: ReadonlyArray<
    Scene.SceneStep<Reel.Model, Reel.Message, ReelLayout.OutMessage>
  >
) => {
  Scene.scene(
    { update: reelUpdate(LAYOUT), view: reelView(LAYOUT) },
    Scene.given(model),
    ...steps
  );
};

const carriedInFirstColumn = (paneId: string, index: number) =>
  reelUpdate(LAYOUT)(
    reelUpdate(LAYOUT)(fresh, press(paneId)).model,
    pointer("MovedPointer", Option.some(into("c1", index)))
  ).model;

describe("Reel view", () => {
  it("names the reel, and makes each pane a region named by its title with its grip first", () => {
    reelScene(
      fresh,
      Scene.expect(Scene.role("group", { name: "Task panes" })).toHaveClass(
        "reel"
      ),
      Scene.expectAll(Scene.all.role("region")).toHaveCount(4),
      Scene.expect(Scene.role("region", { name: "Notes" })).toHaveClass(
        "window"
      ),
      Scene.expect(
        Scene.selector("#work-notes .panel-lead [data-reel-grip]")
      ).toHaveAttr("aria-label", "Move Notes"),
      Scene.expect(Scene.role("button", { name: "Move Notes" })).toHaveAttr(
        "aria-roledescription",
        "draggable"
      ),
      Scene.expect(Scene.role("button", { name: "Move Notes" })).toHaveAttr(
        "aria-pressed",
        "false"
      ),
      Scene.expect(Scene.role("button", { name: "Move Notes" })).toHaveAttr(
        "aria-describedby",
        "work-grip-help"
      ),
      Scene.expect(Scene.selector("#work-grip-help")).toContainText(
        "Arrow keys move it"
      ),
      Scene.expect(Scene.role("listbox")).toBeAbsent(),
      Scene.expect(Scene.role("option")).toBeAbsent()
    );
  });

  it("keeps the panes in one order by id, each pinned to its slot, the focused one marked", () => {
    reelScene(
      fresh,
      Scene.expect(Scene.nth(Scene.all.selector(".reel-pane"), 0)).toHaveAttr(
        "data-reel-pane",
        "work/pane/canvas"
      ),
      Scene.expect(Scene.nth(Scene.all.selector(".reel-pane"), 3)).toHaveAttr(
        "data-reel-pane",
        "work/pane/shell"
      ),
      Scene.expect(
        Scene.selector('[data-reel-pane="work/pane/shell"]')
      ).toHaveStyle("--reel-anchor", "--reel-3"),
      Scene.expect(Scene.selector('[data-reel-slot="shell"]')).toHaveStyle(
        "--reel-anchor",
        "--reel-3"
      ),
      Scene.expect(
        Scene.selector('[data-reel-pane="work/pane/shell"]')
      ).toHaveClass("focused"),
      Scene.expect(
        Scene.selector('[data-reel-pane="work/pane/notes"]')
      ).not.toHaveClass("focused")
    );
  });

  it("gives each column a width splitter and each stacked pane a height splitter, named and valued", () => {
    reelScene(
      fresh,
      Scene.expect(
        Scene.role("separator", { name: "Width of column 1" })
      ).toHaveAttr("aria-orientation", "vertical"),
      Scene.expect(
        Scene.role("separator", { name: "Width of column 1" })
      ).toHaveAttr("aria-valuenow", "50"),
      Scene.expect(
        Scene.role("separator", { name: "Width of column 1" })
      ).toHaveAttr("aria-valuetext", "half the width"),
      Scene.expect(
        Scene.role("separator", { name: "Width of column 2" })
      ).toHaveAttr("data-reel-resize", "c2"),
      Scene.expectAll(Scene.all.role("separator")).toHaveCount(4),
      Scene.expect(
        Scene.role("separator", { name: "Height of Shell" })
      ).toHaveAttr("aria-orientation", "horizontal"),
      Scene.expect(
        Scene.role("separator", { name: "Height of Shell" })
      ).toHaveAttr("aria-valuenow", "50")
    );
  });

  it("prints a dragged splitter's resize before it is asked for", () => {
    const resizing = reelUpdate(LAYOUT)(
      reelUpdate(LAYOUT)(
        fresh,
        pressSplitter({ _tag: "Width", columnId: "c1" })
      ).model,
      Reel.Message.MovedSplitter({ share: 0.25 })
    ).model;

    reelScene(
      resizing,
      Scene.expect(Scene.selector('[data-reel-column="c1"]')).toHaveStyle(
        "--reel-width",
        "0.75"
      ),
      Scene.expect(
        Scene.role("separator", { name: "Width of column 1" })
      ).toHaveAttr("aria-valuetext", "75% of the width")
    );
  });

  it("marks a held pane, and where a keyboard drop would land", () => {
    const held = reelUpdate(LAYOUT)(
      fresh,
      Reel.Message.PressedGripKey({ paneId: NOTES })
    ).model;

    const overGap = reelUpdate(LAYOUT)(held, step("Right")).model;
    const intoDiff = reelUpdate(LAYOUT)(overGap, step("Right")).model;

    reelScene(
      held,
      Scene.expect(Scene.role("button", { name: "Move Notes" })).toHaveAttr(
        "aria-pressed",
        "true"
      ),
      Scene.expect(
        Scene.selector('[data-reel-pane="work/pane/notes"]')
      ).toHaveClass("drag-dim"),
      Scene.expect(Scene.selector(".drop-here")).toBeAbsent(),
      Scene.expect(Scene.selector(".drop-before")).toBeAbsent()
    );
    reelScene(
      overGap,
      Scene.expect(Scene.selector(".reel-resize.drop-here")).toHaveAttr(
        "data-reel-resize",
        "c1"
      )
    );
    reelScene(
      intoDiff,
      Scene.expect(Scene.selector('[data-reel-slot="diff"]')).toHaveClass(
        "drop-before"
      )
    );
  });

  it("lets a pointer carry the title bars alone, drawn by the reel, with no ids", () => {
    const pressed = reelUpdate(LAYOUT)(fresh, press(NOTES)).model;

    const carried = reelUpdate(LAYOUT)(
      pressed,
      pointer("MovedPointer", Option.some(into("c2", 1)))
    ).model;

    reelScene(
      pressed,
      Scene.expect(Scene.selector(".reel-lift")).toBeAbsent(),
      Scene.expect(Scene.role("button", { name: "Move Notes" })).toHaveAttr(
        "aria-pressed",
        "false"
      )
    );
    reelScene(
      carried,
      sizeLifted,
      Scene.expect(Scene.selector(".reel-lift")).toHaveAttr(
        "aria-hidden",
        "true"
      ),
      Scene.expect(Scene.selector(".reel-lift .panel-tb")).toContainText(
        "Notes"
      ),
      Scene.expect(Scene.selector(".reel-lift .pane-text")).toBeAbsent(),
      Scene.expect(Scene.selector(".reel-lift [id]")).toBeAbsent(),
      Scene.expect(Scene.selector(".reel-lift [data-reel-grip]")).toBeAbsent(),
      Scene.expect(Scene.selector('[data-reel-slot="diff"]')).toHaveClass(
        "drop-after"
      )
    );
  });

  it("marks a drop among the carried pane's own column with the carried pane left out", () => {
    reelScene(
      carriedInFirstColumn(NOTES, 0),
      sizeLifted,
      Scene.expect(Scene.selector('[data-reel-slot="shell"]')).toHaveClass(
        "drop-before"
      ),
      Scene.expect(Scene.selector(".drop-after")).toBeAbsent()
    );
    reelScene(
      carriedInFirstColumn("shell", 1),
      sizeLifted,
      Scene.expect(Scene.selector('[data-reel-slot="notes"]')).toHaveClass(
        "drop-after"
      ),
      Scene.expect(Scene.selector(".drop-before")).toBeAbsent()
    );
  });

  it("titles the carried copy with the pane's label as written, as its title bar is", () => {
    const layout: ReelLayout.Layout = [
      { id: "c1", width: 1 / 2, panes: [pane("notes", "notes.md")] },
      { id: "c2", width: 1 / 2, panes: [pane("diff", "Diff")] },
    ];

    const carried = reelUpdate(layout)(
      reelUpdate(layout)(fresh, press(NOTES)).model,
      pointer("MovedPointer", Option.some(into("c2", 1)))
    ).model;

    Scene.scene(
      { update: reelUpdate(layout), view: reelView(layout) },
      Scene.given(carried),
      sizeLifted,
      Scene.expect(Scene.selector(".reel-lift h2")).toHaveText("notes.md")
    );
  });
});

const tabbedScene = (
  model: Reel.Model,
  ...steps: ReadonlyArray<
    Scene.SceneStep<Reel.Model, Reel.Message, ReelLayout.OutMessage>
  >
) => {
  Scene.scene(
    { update: reelUpdate(LAYOUT), view: reelView(LAYOUT, "Tabs") },
    Scene.given(model),
    ...steps
  );
};

const tab = (name: string) => Scene.role("tab", { name });

const tabFocus = (paneId: string) =>
  Scene.Command.resolve(
    Reel.FocusTab({ tabHook: `work/tab/${paneId}` }),
    Reel.Message.CompletedFocusTab()
  );

describe("Reel view under tabs", () => {
  it("prints a tab per pane in reading order over one stage, the focused pane's selected", () => {
    tabbedScene(
      fresh,
      Scene.expect(Scene.role("group", { name: "Task panes" })).toHaveClass(
        "tabbed"
      ),
      Scene.expect(Scene.role("tablist", { name: "Task panes" })).toHaveClass(
        "reel-tabs"
      ),
      Scene.expectAll(Scene.all.role("tab")).toHaveCount(4),
      Scene.expect(Scene.nth(Scene.all.role("tab"), 0)).toHaveText("Shell"),
      Scene.expect(Scene.nth(Scene.all.role("tab"), 1)).toHaveText("Notes"),
      Scene.expect(Scene.nth(Scene.all.role("tab"), 3)).toHaveText("Canvas"),
      Scene.expect(tab("Shell")).toHaveAttr("aria-selected", "true"),
      Scene.expect(tab("Shell")).toHaveAttr("aria-controls", "work-shell"),
      Scene.expect(tab("Notes")).toHaveAttr("aria-selected", "false"),
      Scene.expectAll(Scene.all.selector(".reel-stage")).toHaveCount(1),
      Scene.expect(Scene.selector(".reel-column")).toBeAbsent()
    );
  });

  it("pins every pane to the stage, the ones behind hidden and inert, with no grips and no splitters", () => {
    tabbedScene(
      fresh,
      Scene.expectAll(Scene.all.selector(".reel-pane")).toHaveCount(4),
      Scene.expect(
        Scene.selector('[data-reel-pane="work/pane/notes"]')
      ).toHaveStyle("--reel-anchor", "--reel-stage"),
      Scene.expect(Scene.selector(".reel-stage")).toHaveStyle(
        "--reel-anchor",
        "--reel-stage"
      ),
      Scene.expect(
        Scene.selector('[data-reel-pane="work/pane/shell"]')
      ).not.toHaveClass("behind"),
      Scene.expect(
        Scene.selector('[data-reel-pane="work/pane/notes"]')
      ).toHaveClass("behind"),
      Scene.expect(
        Scene.selector('[data-reel-pane="work/pane/notes"]')
      ).toHaveAttr("inert", "true"),
      Scene.expect(
        Scene.selector('[data-reel-pane="work/pane/shell"]')
      ).not.toHaveAttr("inert"),
      Scene.expect(Scene.selector("[data-reel-grip]")).toBeAbsent(),
      Scene.expect(Scene.selector(".panel-lead")).toBeAbsent(),
      Scene.expect(Scene.role("separator")).toBeAbsent()
    );
  });

  it("shows a pressed tab's pane and puts the keyboard in it", () => {
    tabbedScene(
      fresh,
      Scene.click(tab("Diff")),
      Scene.Command.resolve(
        Reel.FocusPane({ paneHook: "work/pane/diff" }),
        Reel.Message.CompletedFocusPane()
      ),
      Scene.expect(tab("Diff")).toHaveAttr("aria-selected", "true"),
      Scene.expect(tab("Shell")).toHaveAttr("aria-selected", "false"),
      Scene.expect(
        Scene.selector('[data-reel-pane="work/pane/diff"]')
      ).not.toHaveClass("behind"),
      Scene.expect(
        Scene.selector('[data-reel-pane="work/pane/shell"]')
      ).toHaveClass("behind")
    );
  });

  it("selects with the side arrows, wrapping, and Home and End, keeping the keyboard on the tabs", () => {
    tabbedScene(
      fresh,
      Scene.keydown(tab("Shell"), "ArrowLeft"),
      tabFocus("canvas"),
      Scene.expect(tab("Canvas")).toHaveAttr("aria-selected", "true"),
      Scene.keydown(tab("Canvas"), "ArrowRight"),
      tabFocus("shell"),
      Scene.keydown(tab("Shell"), "End"),
      tabFocus("canvas"),
      Scene.keydown(tab("Canvas"), "Home"),
      tabFocus("shell"),
      Scene.keydown(tab("Shell"), "ArrowRight", {
        metaKey: true,
        altKey: true,
      }),
      Scene.expectIgnored(),
      Scene.keydown(tab("Shell"), "ArrowDown"),
      Scene.expectIgnored()
    );
  });

  it("says a tab in its label, after what the parent gives to lead it", () => {
    Scene.scene(
      {
        update: reelUpdate(LAYOUT),
        view: (model: Reel.Model, h: HtmlBuilder<Reel.Message>) =>
          Reel.view(
            model,
            {
              layout: LAYOUT,
              label: "Task panes",
              toPaneView: windowOf(h),
              arrangement: "Tabs",
              toTabLeadView: (shown) => [
                h.span([h.Class("tab-lead")], [`${shown.label}:`]),
              ],
            },
            h
          ),
      },
      Scene.given(fresh),
      Scene.expect(Scene.nth(Scene.all.role("tab"), 1)).toHaveText(
        "Notes:Notes"
      ),
      Scene.expect(
        Scene.selector('[data-reel-tab="work/tab/notes"] .reel-tab-words')
      ).toHaveText("Notes"),
      Scene.expectAll(Scene.all.selector(".reel-tabs .tab-lead")).toHaveCount(4)
    );
  });
});

const announced = (text: string) =>
  Scene.Command.resolve(
    Reel.AnnounceReel({ text }),
    Reel.Message.CompletedAnnounceReel()
  );

describe("Reel keys", () => {
  const widthOne = Scene.role("separator", { name: "Width of column 1" });
  const shellHeight = Scene.role("separator", { name: "Height of Shell" });
  const notesGrip = Scene.role("button", { name: "Move Notes" });

  it("steps a width splitter by the side arrows and a height splitter by up and down, from the layout's sizes", () => {
    reelScene(
      fresh,
      Scene.keydown(widthOne, "ArrowLeft"),
      Scene.expectOutMessage(ResizedColumn({ columnId: "c1", width: 0.45 })),
      Scene.keydown(shellHeight, "ArrowDown"),
      Scene.expectOutMessage(
        ResizedPanes({ columnId: "c1", weights: { shell: 1.1, notes: 0.9 } })
      )
    );
  });

  it("leaves a splitter's other arrows, and a modified one, which is the application's", () => {
    reelScene(
      fresh,
      Scene.keydown(widthOne, "ArrowUp"),
      Scene.expectIgnored(),
      Scene.keydown(widthOne, "ArrowRight", { metaKey: true, altKey: true }),
      Scene.expectIgnored()
    );
  });

  it("holds a pane on its grip: the grip's arrows move it, a modified one is left, and leaving the grip puts it back", () => {
    reelScene(
      fresh,
      Scene.keydown(notesGrip, " "),
      announced(
        "Picked up Notes. Arrow keys move it, space drops it, escape or tab puts it back."
      ),
      Scene.expect(notesGrip).toHaveAttr("aria-pressed", "true"),
      Scene.keydown(notesGrip, "ArrowRight", { metaKey: true, altKey: true }),
      Scene.expectIgnored(),
      Scene.keydown(notesGrip, "ArrowRight"),
      announced("Notes, column 2 of 4."),
      Scene.Command.resolve(
        Reel.ScrollIntoView({ hook: "work/column/c2" }),
        Reel.Message.CompletedScrollIntoView()
      ),
      Scene.expect(Scene.selector(".reel-gap.drop-here")).toHaveAttr(
        "data-reel-resize",
        "c1"
      ),
      Scene.blur(notesGrip),
      announced("Move cancelled. Notes put back where it was."),
      Scene.expectNoOutMessage(),
      Scene.expect(notesGrip).toHaveAttr("aria-pressed", "false")
    );
  });
});

const Live = Schema.Struct({
  reel: Reel.Model,
  layout: ReelLayout.Layout,
  arrangement: Reel.Arrangement,
});

type Live = typeof Live.Type;

const LIVE_START: Live = { reel: fresh, layout: LAYOUT, arrangement: "Strip" };

const LiveMessage = defineMessageUnion({
  GotReelMessage: { message: Reel.Message },
  PressedReelKey: { action: Reel.Action },
  AddedPane: { paneId: Schema.String },
  ToggledTabs: {},
});

type LiveMessage = typeof LiveMessage.Type;

const foldLiveReel = (
  model: Live,
  stepReel: (reel: Reel.Model) => ReturnType<typeof Reel.update>
): FoldkitUpdate.Return<Live, LiveMessage> =>
  FoldkitUpdate.foldChildStep({
    update: stepReel,
    read: (live: Live) => Option.some(live.reel),
    write: (live: Live, nextReel: Reel.Model): Live =>
      modifyFields(live, { reel: () => nextReel }),
    toParentMessage: (childMessage: Reel.Message) =>
      LiveMessage.GotReelMessage({ message: childMessage }),
    foldOutMessage: (request: ReelLayout.OutMessage) => (live: Live) => ({
      model: modifyFields(live, {
        layout: (layout) => ReelLayout.apply(layout, request),
      }),
    }),
  })(model);

const liveUpdate = (model: Live, message: LiveMessage) =>
  LiveMessage.match<FoldkitUpdate.Return<Live, LiveMessage>>(message, {
    GotReelMessage: ({ message: reelMessage }) =>
      foldLiveReel(model, (reel) =>
        Reel.update(reel, reelMessage, { layout: model.layout })
      ),
    PressedReelKey: ({ action }) =>
      foldLiveReel(model, (reel) =>
        Reel.perform(reel, action, {
          layout: model.layout,
          arrangement: model.arrangement,
        })
      ),
    ToggledTabs: () => ({
      model: modifyFields(model, {
        arrangement: (arrangement) =>
          arrangement === "Tabs" ? "Strip" : "Tabs",
      }),
    }),
    AddedPane: ({ paneId }) => ({
      model: modifyFields(model, {
        layout: (layout) => [
          ...layout,
          { id: paneId, width: 1 / 2, panes: [pane(paneId, paneId)] },
        ],
      }),
    }),
  });

const liveView = (model: Live, h: HtmlBuilder<LiveMessage>) =>
  h.div(
    [],
    [
      h.button(
        [h.Id("add-pane"), h.OnClick(LiveMessage.AddedPane({ paneId: "log" }))],
        ["add"]
      ),
      h.button(
        [h.Id("toggle-tabs"), h.OnClick(LiveMessage.ToggledTabs())],
        ["tabs"]
      ),
      h.button(
        [
          h.Id("move-column-left"),
          h.OnClick(LiveMessage.PressedReelKey({ action: "MoveColumnLeft" })),
        ],
        ["move column"]
      ),
      h.button(
        [
          h.Id("widen-column"),
          h.OnClick(
            LiveMessage.GotReelMessage({
              message: Reel.Message.PressedSplitterKey({
                splitter: { _tag: "Width", columnId: "c2" },
                share: 1 / 3,
              }),
            })
          ),
        ],
        ["widen"]
      ),
      h.submodel({
        slotId: "work",
        model: model.reel,
        view: Reel.view,
        viewInputs: {
          layout: model.layout,
          label: "Task panes",
          toPaneView: windowOf(h),
          arrangement: model.arrangement,
        },
        toParentMessage: (message) => LiveMessage.GotReelMessage({ message }),
      }),
    ]
  );

const liveSubscriptions = FoldkitSubscription.lift(Reel.subscriptions("work"))<
  Live,
  LiveMessage
>({
  read: (model) => Option.some(model.reel),
  toParentMessage: (message) => LiveMessage.GotReelMessage({ message }),
});

const paneOf = (paneId: string): HTMLElement =>
  bySelector(`[data-reel-pane="work/pane/${paneId}"]`);

const layer = (): HTMLElement => bySelector(".reel-panes");

const slotsIn = (columnId: string): ReadonlyArray<string | undefined> =>
  Array.map(
    Array.fromIterable(
      document.querySelectorAll(
        `[data-reel-column="${columnId}"] [data-reel-slot]`
      )
    ),
    (slot) =>
      slot instanceof HTMLElement ? slot.dataset["reelSlot"] : undefined
  );

const mountReel = async (): Promise<void> => {
  embed({
    Model: Live,
    init: () => ({ model: LIVE_START }),
    update: liveUpdate,
    view: liveView,
    subscriptions: liveSubscriptions,
  });
  await settleUntil(() => document.querySelector(".reel-panes") !== null);
};

const pressOn = async (target: EventTarget, pressed: string): Promise<void> => {
  target.dispatchEvent(keydown(pressed));
  await settle();
};

describe("Reel pane order", () => {
  afterEach(() => {
    disposeEmbedded();
  });

  it("moves a pane between columns, a column and a width, without taking any pane out of the page", async () => {
    await mountReel();
    const notes = paneOf("notes");
    const records: MutationRecord[] = [];

    const observer = new MutationObserver((found) => {
      records.push(...found);
    });

    observer.observe(layer(), { childList: true });

    const grip = bySelector("[data-reel-grip]", notes);

    grip.focus();
    await pressOn(grip, " ");
    await pressOn(grip, "ArrowRight");
    await pressOn(grip, "ArrowRight");
    await pressOn(grip, " ");
    await settleUntil(() => slotsIn("c2").includes("notes"));

    byId("move-column-left").click();
    await settleUntil(() =>
      Option.exists(
        htmlElement("[data-reel-column]"),
        (column) => column.dataset["reelColumn"] === "c2"
      )
    );

    byId("widen-column").click();
    await settleUntil(() =>
      Option.exists(
        htmlElement('[data-reel-column="c2"]'),
        (column) => column.style.getPropertyValue("--reel-width") === "1"
      )
    );
    observer.disconnect();

    expect(
      bySelector('[data-reel-column="c2"]').style.getPropertyValue(
        "--reel-width"
      )
    ).toBe("1");
    expect(bySelector("[data-reel-column]").dataset["reelColumn"]).toBe("c2");
    expect(slotsIn("c2")).toStrictEqual(["notes", "diff"]);
    expect(document.activeElement).toBe(grip);
    expect(paneOf("notes")).toBe(notes);
    expect(records).toStrictEqual([]);
  });

  it("turns to tabs and back without taking any pane, or the layer, out of the page", async () => {
    await mountReel();
    const before = Array.fromIterable(layer().children);
    const panes = layer();
    const records: MutationRecord[] = [];

    const observer = new MutationObserver((found) => {
      records.push(...found);
    });

    observer.observe(layer(), { childList: true });

    byId("toggle-tabs").click();
    await settleUntil(() => document.querySelector(".reel-stage") !== null);

    expect(document.querySelector(".reel-column")).toBeNull();
    expect(
      Array.map(
        Array.fromIterable(
          document.querySelectorAll<HTMLElement>('[role="tab"]')
        ),
        (tabElement) => tabElement.tabIndex
      )
    ).toStrictEqual([0, -1, -1, -1]);
    expect(paneOf("notes").classList.contains("behind")).toBe(true);
    expect(layer()).toBe(panes);

    byId("toggle-tabs").click();
    await settleUntil(() => document.querySelector(".reel-stage") === null);
    observer.disconnect();

    expect(slotsIn("c1")).toStrictEqual(["shell", "notes"]);
    expect(layer()).toBe(panes);
    expect(Array.fromIterable(layer().children)).toStrictEqual(before);
    expect(records).toStrictEqual([]);
  });

  it("adds a pane in its place by id, moving none of the others", async () => {
    await mountReel();
    const before = Array.fromIterable(layer().children);
    const records: MutationRecord[] = [];

    const observer = new MutationObserver((found) => {
      records.push(...found);
    });

    observer.observe(layer(), { childList: true });

    byId("add-pane").click();
    await settleUntil(
      () => document.querySelector('[data-reel-pane="work/pane/log"]') !== null
    );
    observer.disconnect();

    expect(
      Array.map(records, ({ addedNodes, removedNodes }) => [
        addedNodes.length,
        removedNodes.length,
      ])
    ).toStrictEqual([[1, 0]]);
    expect(
      Array.filter(Array.fromIterable(layer().children), (child) =>
        before.includes(child)
      )
    ).toStrictEqual(before);
    expect(
      Array.map(Array.fromIterable(layer().children), (child) =>
        child instanceof HTMLElement ? child.dataset["reelPane"] : undefined
      )
    ).toStrictEqual([
      "work/pane/canvas",
      "work/pane/diff",
      "work/pane/log",
      "work/pane/notes",
      "work/pane/shell",
    ]);
  });
});

const gripOf = (hook: string): HTMLElement =>
  bySelector(`[data-reel-grip="${hook}"]`);

const pointerEvent = (
  type: string,
  pointerId: number,
  x: number
): PointerEvent =>
  new PointerEvent(type, {
    pointerId,
    button: 0,
    clientX: x,
    clientY: 100,
    bubbles: true,
    cancelable: true,
  });

const placeReel = (): (() => number) => {
  const columns = Array.fromIterable(
    document.querySelectorAll("[data-reel-column]")
  );

  for (const view of Array.fromIterable(
    document.querySelectorAll(".reel-view")
  )) {
    vi.spyOn(view, "getBoundingClientRect").mockReturnValue(
      new DOMRect(0, 0, 900, 600)
    );
  }

  const spies = Array.flatMap(columns, (column, index) => [
    vi
      .spyOn(column, "getBoundingClientRect")
      .mockReturnValue(new DOMRect(index * 300, 0, 300, 600)),
    ...Array.map(
      Array.fromIterable(column.querySelectorAll("[data-reel-slot]")),
      (slot, row) =>
        vi
          .spyOn(slot, "getBoundingClientRect")
          .mockReturnValue(new DOMRect(index * 300, row * 200, 300, 200))
    ),
  ]);

  return () => Number.sumAll(Array.map(spies, (spy) => spy.mock.calls.length));
};

describe("Reel live keys and pointer", () => {
  afterEach(() => {
    disposeEmbedded();
  });

  it("takes keys only on the held grip, and lets a field reached by Tab type", async () => {
    await mountReel();
    const grip = gripOf("work/pane/shell");
    grip.focus();
    grip.dispatchEvent(keydown(" "));
    await settleUntil(() => grip.getAttribute("aria-pressed") === "true");

    const elsewhere = keydown("ArrowRight");
    document.dispatchEvent(elsewhere);
    const onGrip = keydown("ArrowRight");
    grip.dispatchEvent(onGrip);
    await settle();

    const field = document.createElement("input");
    document.body.append(field);
    field.focus();
    await settleUntil(
      () => gripOf("work/pane/shell").getAttribute("aria-pressed") === "false"
    );
    const typed = keydown(" ");
    field.dispatchEvent(typed);
    field.remove();

    expect(elsewhere.defaultPrevented).toBe(false);
    expect(onGrip.defaultPrevented).toBe(true);
    expect(typed.defaultPrevented).toBe(false);
  });

  it("carries a pane once the pressing pointer moves past the threshold, follows no other, and lets go on release", async () => {
    await mountReel();
    gripOf("work/pane/notes").dispatchEvent(
      pointerEvent("pointerdown", 1, 100)
    );
    await settle();

    await settleUntil(() => {
      document.dispatchEvent(pointerEvent("pointermove", 2, 400));

      return false;
    }, 5);
    const isCarriedByOther = document.querySelector(".reel-lift") !== null;

    await settleUntil(() => {
      document.dispatchEvent(pointerEvent("pointermove", 1, 103));
      document.dispatchEvent(pointerEvent("pointermove", 1, 400));

      return document.querySelector(".reel-lift") !== null;
    });
    expect(gripOf("work/pane/notes").getAttribute("aria-pressed")).toBe("true");
    expect("pixelPaperDragging" in document.documentElement.dataset).toBe(true);

    document.dispatchEvent(pointerEvent("pointerup", 1, 400));
    await settleUntil(() => document.querySelector(".reel-lift") === null);

    expect(isCarriedByOther).toBe(false);
    expect(gripOf("work/pane/notes").getAttribute("aria-pressed")).toBe(
      "false"
    );
    expect("pixelPaperDragging" in document.documentElement.dataset).toBe(
      false
    );
  });

  it("reads a carried pane's target once a frame from the column under it, and drops it where it was let go", async () => {
    await mountReel();
    gripOf("work/pane/notes").dispatchEvent(
      pointerEvent("pointerdown", 1, 100)
    );
    await settleUntil(() => {
      document.dispatchEvent(pointerEvent("pointermove", 1, 400));

      return document.querySelector(".reel-lift") !== null;
    });
    await settle(50);
    const reads = placeReel();

    for (const x of [440, 445, 450, 455, 460]) {
      document.dispatchEvent(pointerEvent("pointermove", 1, x));
    }

    await settleUntil(() => document.querySelector(".drop-before") !== null);
    await settle(50);

    expect(reads()).toBe(4);
    expect(bySelector(".drop-before").dataset["reelSlot"]).toBe("diff");

    document.dispatchEvent(pointerEvent("pointermove", 1, 750));
    document.dispatchEvent(pointerEvent("pointerup", 1, 750));
    await settleUntil(() => document.querySelector(".reel-lift") === null);

    expect(slotsIn("c3")).toStrictEqual(["notes", "canvas"]);
  });

  it("puts a carried pane back on Escape", async () => {
    await mountReel();
    gripOf("work/pane/notes").dispatchEvent(
      pointerEvent("pointerdown", 1, 100)
    );
    await settleUntil(() => {
      document.dispatchEvent(pointerEvent("pointermove", 1, 400));

      return document.querySelector(".reel-lift") !== null;
    });

    const escape = keydown("Escape");
    document.dispatchEvent(escape);
    await settleUntil(() => document.querySelector(".reel-lift") === null);

    expect(escape.defaultPrevented).toBe(true);
  });
});
