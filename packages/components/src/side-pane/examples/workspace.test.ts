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
