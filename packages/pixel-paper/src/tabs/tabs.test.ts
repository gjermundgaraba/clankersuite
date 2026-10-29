import { Tabs as UiTabs } from "@foldkit/ui";
import { Option, Schema } from "effect";
import { Scene, Story } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";
import * as Update from "foldkit/update";
import { describe, it } from "vite-plus/test";

import * as Tabs from "./tabs.ts";

const TABS: readonly Tabs.Tab[] = [
  { value: "open", label: "open" },
  { value: "done", label: "done" },
  { value: "all", label: "all" },
];

describe("Tabs update", () => {
  it("reports the chosen tab's value and puts the keyboard on it", () => {
    Story.story(
      Tabs.update,
      Story.given(Tabs.init({ id: "items" })),
      Story.message(
        Tabs.Message.GotTabsMessage({
          message: UiTabs.Message.SelectedTab({ index: 1, value: "done" }),
        })
      ),
      Story.expectOutMessage(Tabs.OutMessage.Selected({ value: "done" })),
      Story.Command.expectExact(UiTabs.FocusTab({ id: "items", index: 1 })),
      Story.Command.resolve(UiTabs.FocusTab, UiTabs.Message.CompletedFocusTab())
    );
  });
});

const Parent = Schema.Struct({ tabs: Tabs.Model, selected: Schema.String });

type Parent = typeof Parent.Type;

const ParentMessage = defineMessageUnion({
  GotTabsMessage: { message: Tabs.Message },
});

type ParentMessage = typeof ParentMessage.Type;

const foldTabs = Update.foldChild({
  update: Tabs.update,
  read: (model: Parent) => Option.some(model.tabs),
  write: (model: Parent, nextTabs: Tabs.Model) =>
    modifyFields(model, { tabs: () => nextTabs }),
  toParentMessage: (message: Tabs.Message) =>
    ParentMessage.GotTabsMessage({ message }),
  foldOutMessage: Tabs.OutMessage.match<Update.Step<Parent, ParentMessage>>({
    Selected:
      ({ value }) =>
      (model) => ({ model: modifyFields(model, { selected: () => value }) }),
  }),
});

const parentUpdate = (model: Parent, message: ParentMessage) =>
  ParentMessage.match<Update.Return<Parent, ParentMessage>>(message, {
    GotTabsMessage: ({ message: tabsMessage }) => foldTabs(model, tabsMessage),
  });

const parentView = (model: Parent, h: HtmlBuilder<ParentMessage>) =>
  h.submodel({
    slotId: Tabs.id(model.tabs),
    model: model.tabs,
    view: Tabs.view,
    viewInputs: {
      label: "Items",
      tabs: TABS,
      selectedValue: model.selected,
      toPanelView: () => [h.p([], [`the ${model.selected} items`])],
    },
    toParentMessage: (message) => ParentMessage.GotTabsMessage({ message }),
  });

const given = Scene.given<Parent>({
  tabs: Tabs.init({ id: "items" }),
  selected: "open",
});

const tab = (name: string) => Scene.role("tab", { name });

describe("Tabs", () => {
  it("is a named tab list over the panel its selected tab names", () => {
    Scene.scene(
      { update: parentUpdate, view: parentView },
      given,
      Scene.expect(Scene.role("tablist", { name: "Items" })).toHaveClass("nav"),
      Scene.expect(Scene.role("tablist", { name: "Items" })).toHaveClass(
        "tabs"
      ),
      Scene.expect(tab("open")).toHaveAttr("aria-selected", "true"),
      Scene.expect(tab("done")).toHaveAttr("aria-selected", "false"),
      Scene.expect(Scene.role("tabpanel", { name: "open" })).toHaveText(
        "the open items"
      )
    );
  });

  it("selects by a press, and by the arrows, wrapping, and Home and End", () => {
    Scene.scene(
      { update: parentUpdate, view: parentView },
      given,
      Scene.click(tab("done")),
      Scene.Command.resolve(
        UiTabs.FocusTab,
        UiTabs.Message.CompletedFocusTab()
      ),
      Scene.expect(tab("done")).toHaveAttr("aria-selected", "true"),
      Scene.expect(Scene.role("tabpanel", { name: "done" })).toHaveText(
        "the done items"
      ),
      Scene.keydown(tab("done"), "ArrowRight"),
      Scene.Command.resolve(
        UiTabs.FocusTab,
        UiTabs.Message.CompletedFocusTab()
      ),
      Scene.expect(tab("all")).toHaveAttr("aria-selected", "true"),
      Scene.keydown(tab("all"), "ArrowRight"),
      Scene.Command.resolve(
        UiTabs.FocusTab,
        UiTabs.Message.CompletedFocusTab()
      ),
      Scene.expect(tab("open")).toHaveAttr("aria-selected", "true"),
      Scene.keydown(tab("open"), "End"),
      Scene.Command.resolve(
        UiTabs.FocusTab,
        UiTabs.Message.CompletedFocusTab()
      ),
      Scene.expect(tab("all")).toHaveAttr("aria-selected", "true"),
      Scene.keydown(tab("all"), "Home"),
      Scene.Command.resolve(
        UiTabs.FocusTab,
        UiTabs.Message.CompletedFocusTab()
      ),
      Scene.expect(tab("open")).toHaveAttr("aria-selected", "true")
    );
  });
});
