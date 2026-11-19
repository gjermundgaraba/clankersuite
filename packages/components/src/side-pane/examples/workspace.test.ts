import { Menu } from "@gjermundgaraba/components";
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

  it("edits the picked task's title in the pane, and moves it from the When menu", () => {
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
});
