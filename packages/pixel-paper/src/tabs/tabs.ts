import { Tabs as UiTabs } from "@foldkit/ui";
import { Array, Option, Schema } from "effect";
import type { Html } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";
import { defineView } from "foldkit/submodel";
import * as Update from "foldkit/update";

/** Schema for a tab strip: the `@foldkit/ui` Tabs it is built on, which keeps where the
 *  keyboard is. Which tab is selected is the parent's: pass it in as `selectedValue`. */
export const Model = Schema.Struct({
  tabs: UiTabs.Model,
});

export type Model = typeof Model.Type;

/** Union of all Messages a tab strip can produce. */
export const Message = defineMessageUnion({
  GotTabsMessage: { message: UiTabs.Message },
});

export type Message = typeof Message.Type;

/** Union of OutMessages a tab strip reports: a tab was chosen by a press, an arrow, Home or
 *  End. Store `value` and pass it back in as `selectedValue`. */
export const OutMessage = defineMessageUnion({
  Selected: { value: Schema.String },
});

export type OutMessage = typeof OutMessage.Type;

/** Configuration for creating a tab strip with `init`. The `id` must be unique in the
 *  document; each tab's and panel's id derives from it. */
export type InitConfig = Readonly<{ id: string }>;

/** Creates a tab strip. Arrows select as they move. */
export const init = (config: InitConfig): Model => ({
  tabs: UiTabs.init({ id: config.id, activationMode: "Automatic" }),
});

/** The tab strip's id, unique in the document. */
export const id = (model: Model): string => model.tabs.id;

const StringTabs = UiTabs.create();

const foldTabs = Update.foldChild({
  update: StringTabs.update,
  read: (model: Model) => Option.some(model.tabs),
  write: (model: Model, nextTabs: UiTabs.Model) =>
    modifyFields(model, { tabs: () => nextTabs }),
  toParentMessage: (message: UiTabs.Message) =>
    Message.GotTabsMessage({ message }),
  toParentOutMessage: UiTabs.OutMessage.match<OutMessage>({
    Selected: ({ value }) => OutMessage.Selected({ value }),
  }),
});

/** Processes a tab strip Message and returns the next Model, Commands and OutMessage. */
export const update = (model: Model, message: Message) =>
  Message.match<Update.ReturnWithOutMessage<Model, Message, OutMessage>>(
    message,
    {
      GotTabsMessage: ({ message: tabsMessage }) =>
        foldTabs(model, tabsMessage),
    }
  );

/** One tab: its value and its words. */
export type Tab = Readonly<{
  value: string;
  label: string;
}>;

/** Per-render inputs passed to `view` through `h.submodel`'s `viewInputs`. */
export type ViewInputs = Readonly<{
  /** Names the tab list for screen readers. */
  label: string;
  tabs: readonly Tab[];
  /** The selected tab's value, from the parent's Model. */
  selectedValue: string;
  /** The selected tab's panel. A function because a Submodel's viewInputs may hold functions
   *  only at the top level, and Foldkit runs this one in the parent's boundary, so the
   *  handlers in what it returns dispatch the parent's Messages. */
  toPanelView: () => readonly Html[];
}>;

/**
 * The nav strip at tab size over the selected tab's panel, built on `@foldkit/ui`'s Tabs:
 * `div.nav.tabs[role="tablist"]` of `button[role="tab"][aria-selected]`, then the
 * `div[role="tabpanel"]` named by its tab. Arrows move and select (they wrap), Home and End
 * go to the ends, and only the selected tab is in the keyboard's Tab order.
 */
export const view = defineView<Model, Message, ViewInputs>(
  (model, viewInputs, h): Html => {
    const { label, tabs, selectedValue, toPanelView } = viewInputs;

    const toTabView = (tab: Tab, info: UiTabs.TabInfo): Html =>
      h.keyed("button")(tab.value, info.tab, [tab.label]);

    const toView = (render: UiTabs.RenderInfo): Html =>
      h.div(
        [h.Class("tabbed")],
        [
          h.div(
            [...render.tablist, h.Class("nav tabs")],
            Array.zipWith(tabs, render.tabs, toTabView)
          ),
          ...Option.toArray(
            Option.map(
              Array.findFirst(render.tabs, (info) => info.isActive),
              (info) =>
                h.div([...info.panel, h.Class("tab-panel")], toPanelView())
            )
          ),
        ]
      );

    return h.submodel({
      slotId: id(model),
      model: model.tabs,
      view: StringTabs.view,
      viewInputs: {
        tabs: Array.map(tabs, (tab) => tab.value),
        selectedValue,
        ariaLabel: label,
        toView,
      },
      toParentMessage: (message) => Message.GotTabsMessage({ message }),
    });
  }
);
