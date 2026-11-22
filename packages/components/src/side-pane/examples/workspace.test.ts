import { Dialog as UiDialog } from "@foldkit/ui";
import {
  ConfirmDialog,
  Focus,
  InlineInput,
  Menu,
} from "@gjermundgaraba/components";
import { Option } from "effect";
import { Story } from "foldkit";
import { describe, expect, it } from "vite-plus/test";

import { Message, init, update } from "./workspace.ts";

describe("the workspace example", () => {
  it("shows the pane for the task picked, and drops it from the pane's close", () => {
    Story.story(
      update,
      Story.given(init().model),
      Story.message(Message.ClickedClosePane()),
      Story.model((model) => {
        expect(model.maybeTask).toStrictEqual(Option.none());
      }),
      Story.message(Message.SelectedTask({ task: "Call mom" })),
      Story.model((model) => {
        expect(model.maybeTask).toStrictEqual(Option.some("Call mom"));
      })
    );
  });

  it("edits the picked task's title in the pane, and moves it from the When menu, to a day picked too", () => {
    Story.story(
      update,
      Story.given(init().model),
      Story.message(Message.SelectedTask({ task: "Call mom" })),
      Story.model((model) => {
        expect(model.paneTitle).toBe("Call mom");
      }),
      Story.message(Message.UpdatedPaneTitle({ value: "Call mom tonight" })),
      Story.message(
        Message.GotWhenMessage({
          message: Menu.Message.SelectedItem({
            id: "This evening",
            kind: "Radio",
          }),
        })
      ),
      Story.Command.resolve(Menu.Focus, Menu.Message.CompletedFocus()),
      Story.model((model) => {
        expect(model.paneTitle).toBe("Call mom tonight");
        expect(model.when).toBe("This evening");
      }),
      Story.message(
        Message.GotWhenMessage({
          message: Menu.Message.PickedDay({
            id: "pick-day",
            value: "2026-11-21",
          }),
        })
      ),
      Story.Command.resolve(Menu.Focus, Menu.Message.CompletedFocus()),
      Story.model((model) => {
        expect(model.whenDay).toBe("2026-11-21");
      }),
      Story.message(
        Message.GotWhenMessage({
          message: Menu.Message.SelectedItem({ id: "Tomorrow", kind: "Radio" }),
        })
      ),
      Story.Command.resolve(Menu.Focus, Menu.Message.CompletedFocus()),
      Story.model((model) => {
        expect(model.when).toBe("Tomorrow");
        expect(model.whenDay).toBe("");
      })
    );
  });

  it("deletes the pane's task with its subtasks once its confirm is confirmed, and closes the pane", () => {
    Story.story(
      update,
      Story.given(init().model),
      Story.message(Message.SelectedTask({ task: "Review budget" })),
      Story.message(
        Message.GotMoreMessage({
          message: Menu.Message.SelectedItem({ id: "delete", kind: "Action" }),
        })
      ),
      Story.Command.resolveAll(
        [Menu.Focus, Menu.Message.CompletedFocus()],
        [UiDialog.ShowDialog, UiDialog.Message.SucceededShowDialog()]
      ),
      Story.model((model) => {
        expect(ConfirmDialog.isOpen(model.deleteConfirm)).toBe(true);
      }),
      Story.message(
        Message.GotDeleteConfirmMessage({
          message: ConfirmDialog.Message.ClickedConfirm(),
        })
      ),
      Story.Command.resolve(
        UiDialog.CloseDialog,
        UiDialog.Message.CompletedCloseDialog()
      ),
      Story.model((model) => {
        expect(model.deletedTasks).toStrictEqual(["Review budget"]);
        expect(model.maybeTask).toStrictEqual(Option.none());
        expect(ConfirmDialog.isOpen(model.deleteConfirm)).toBe(false);
      })
    );
  });

  it("checks a task off and lists it in the day's done line", () => {
    Story.story(
      update,
      Story.given(init().model),
      Story.message(Message.ToggledDone({ task: "Call mom", isDone: true })),
      Story.model((model) => {
        expect(model.doneTasks).toStrictEqual([
          "Answer Lars about the offsite",
          "Call mom",
        ]);
      }),
      Story.message(Message.ToggledDone({ task: "Call mom", isDone: false })),
      Story.model((model) => {
        expect(model.doneTasks).toStrictEqual([
          "Answer Lars about the offsite",
        ]);
      })
    );
  });

  it("writes who the task is owed to in place, then puts focus back on its button", () => {
    Story.story(
      update,
      Story.given(init().model),
      Story.message(Message.ClickedOwedTo()),
      Story.Command.resolve(
        InlineInput.FocusField,
        InlineInput.Message.CompletedFocusField()
      ),
      Story.message(
        Message.GotOwedToMessage({
          message: InlineInput.Message.UpdatedDraft({
            value: "Lars",
            replaced: "",
          }),
        })
      ),
      Story.message(
        Message.GotOwedToMessage({
          message: InlineInput.Message.PressedEnter(),
        })
      ),
      Story.Command.expectExact(
        Focus.Focus({ id: "workspace-owed-to-button" })
      ),
      Story.Command.resolve(Focus.Focus, Message.CompletedFocus()),
      Story.model((model) => {
        expect(model.owedTo).toBe("Lars");
        expect(model.maybeOwedTo).toStrictEqual(Option.none());
      })
    );
  });

  it("marks the task done from the pane's More menu", () => {
    Story.story(
      update,
      Story.given(init().model),
      Story.message(
        Message.GotMoreMessage({
          message: Menu.Message.SelectedItem({ id: "done", kind: "Action" }),
        })
      ),
      Story.Command.resolve(Menu.Focus, Menu.Message.CompletedFocus()),
      Story.model((model) => {
        expect(model.doneTasks).toContain("Call mom");
      })
    );
  });
});
