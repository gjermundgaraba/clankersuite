import { Option, Schema } from "effect";
import { Scene } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";
import * as Update from "foldkit/update";
import { afterEach, describe, expect, it } from "vite-plus/test";

import * as InlineInput from "../inline-input/inline-input.ts";
import { disposeEmbedded, embed } from "../test/embed.ts";
import { keydown } from "../test/events.ts";
import { byId } from "../test/fixture.ts";
import { settleUntil } from "../test/settle.ts";
import * as SidePane from "./side-pane.ts";

import RAIL from "../rail/rail.css?raw";
import STYLESHEET from "./side-pane.css?raw";
import TOKENS from "@gjermundgaraba/design-tokens/clankersuite.css?raw";

const NARROWEST_DECK = 421;

describe("SidePane", () => {
  it("is a named complementary landmark holding the application's contents", () => {
    Scene.scene(
      {
        update: (model: null) => ({ model }),
        view: (_model: null, h: HtmlBuilder<never>) =>
          SidePane.view(
            {
              label: "Task details",
              body: [h.p([], ["Two pages: the goal and the budget."])],
            },
            h
          ),
      },
      Scene.given(null),
      Scene.expect(
        Scene.role("complementary", { name: "Task details" })
      ).toHaveClass("gg-side-pane"),
      Scene.expect(
        Scene.role("complementary", { name: "Task details" })
      ).toContainText("Two pages: the goal and the budget.")
    );
  });
});

describe("SidePane top line", () => {
  it("says where the item lives and closes the pane from its close glyph", () => {
    Scene.scene(
      {
        update: (_model: string, message: string) => ({ model: message }),
        view: (model: string, h: HtmlBuilder<string>) =>
          SidePane.view(
            {
              label: "Task details",
              top: {
                context: ["Work"],
                closeLabel: "Close the details",
                onClose: "Closed",
              },
              body: [
                SidePane.titleView({ title: h.h2([], ["Review budget"]) }, h),
                SidePane.notesView({ body: [h.p([], [model])] }, h),
              ],
            },
            h
          ),
      },
      Scene.given("Open"),
      Scene.expect(
        Scene.role("complementary", { name: "Task details" })
      ).toContainText("Work"),
      Scene.expect(Scene.role("heading", { name: "Review budget" })).toExist(),
      Scene.click(Scene.role("button", { name: "Close the details" })),
      Scene.expect(
        Scene.role("complementary", { name: "Task details" })
      ).toContainText("Closed")
    );
  });
});

describe("SidePane top line's menu", () => {
  it("sets the item's menu before the close glyph", () => {
    Scene.scene(
      {
        update: (model: null) => ({ model }),
        view: (_model: null, h: HtmlBuilder<string>) =>
          SidePane.view(
            {
              label: "Task details",
              top: {
                context: ["Work"],
                menu: h.button([], ["More"]),
                closeLabel: "Close the details",
                onClose: "Closed",
              },
              body: [],
            },
            h
          ),
      },
      Scene.given(null),
      Scene.expect(Scene.first(Scene.all.role("button"))).toHaveText("More"),
      Scene.expect(Scene.last(Scene.all.role("button"))).toHaveAccessibleName(
        "Close the details"
      )
    );
  });
});

const EscapeHarness = Schema.Struct({
  escapes: Schema.Finite,
  owedTo: Schema.String,
  maybeOwedTo: Schema.Option(InlineInput.Model),
});

type EscapeHarness = typeof EscapeHarness.Type;

const EscapeMessage = defineMessageUnion({
  PressedPaneEscape: {},
  GotSidePaneMessage: { message: SidePane.Message },
  GotOwedToMessage: { message: InlineInput.Message },
});

type EscapeMessage = typeof EscapeMessage.Type;

const foldOwedTo = Update.foldChild({
  update: InlineInput.update,
  read: (model: EscapeHarness) => model.maybeOwedTo,
  write: (model: EscapeHarness, owedTo: InlineInput.Model): EscapeHarness =>
    modifyFields(model, { maybeOwedTo: () => Option.some(owedTo) }),
  toParentMessage: (message: InlineInput.Message) =>
    EscapeMessage.GotOwedToMessage({ message }),
  foldOutMessage: InlineInput.OutMessage.match<
    Update.Step<EscapeHarness, EscapeMessage>
  >({
    Committed:
      ({ text }) =>
      (model) => ({ model: modifyFields(model, { owedTo: () => text }) }),
    Ended: () => (model) => ({
      model: modifyFields(model, { maybeOwedTo: () => Option.none() }),
    }),
  }),
});

const escapeHarnessUpdate = (model: EscapeHarness, message: EscapeMessage) =>
  EscapeMessage.match<Update.Return<EscapeHarness, EscapeMessage>>(message, {
    PressedPaneEscape: () => ({
      model: modifyFields(model, { escapes: (escapes) => escapes + 1 }),
    }),
    GotSidePaneMessage: () => ({ model }),
    GotOwedToMessage: ({ message: owedToMessage }) =>
      foldOwedTo(model, owedToMessage),
  });

const escapeHarnessView = (
  model: EscapeHarness,
  h: HtmlBuilder<EscapeMessage>
): Html =>
  SidePane.view(
    {
      label: "Task details",
      onEscape: EscapeMessage.PressedPaneEscape(),
      toParentMessage: (message) =>
        EscapeMessage.GotSidePaneMessage({ message }),
      body: [
        h.p([h.Id("pane-body"), h.Tabindex(-1)], [`Escapes: ${model.escapes}`]),
        ...Option.match(model.maybeOwedTo, {
          onNone: () => [],
          onSome: (owedTo) => [
            h.submodel({
              slotId: "owed-to",
              model: owedTo,
              view: InlineInput.view,
              viewInputs: { value: model.owedTo, label: "Owed to" },
              toParentMessage: (message) =>
                EscapeMessage.GotOwedToMessage({ message }),
            }),
          ],
        }),
      ],
    },
    h
  );

describe("SidePane Escape", () => {
  afterEach(disposeEmbedded);

  it("leaves an Escape a field inside took to the field, and closes on one nothing took", async () => {
    embed({
      Model: EscapeHarness,
      init: () => ({
        model: {
          escapes: 0,
          owedTo: "",
          maybeOwedTo: Option.some(InlineInput.init({ id: "owed-to" }).model),
        },
      }),
      update: escapeHarnessUpdate,
      view: escapeHarnessView,
    });
    await settleUntil(() => document.querySelector("#owed-to") !== null);

    const field = byId("owed-to");
    field.focus();
    Object.assign(field, { value: "Lars" });
    field.dispatchEvent(new Event("input", { bubbles: true }));
    const fieldEscape = keydown("Escape");
    field.dispatchEvent(fieldEscape);
    await settleUntil(() => document.querySelector("#owed-to") === null);

    expect(fieldEscape.defaultPrevented).toBe(true);
    expect(byId("pane-body").textContent).toBe("Escapes: 0");

    const paneEscape = keydown("Escape");
    byId("pane-body").dispatchEvent(paneEscape);
    await settleUntil(() => byId("pane-body").textContent === "Escapes: 1");

    expect(paneEscape.defaultPrevented).toBe(true);
  });
});

describe("SidePane's breakpoint", () => {
  it("covers the page wherever the room right of the rail holds less than the pane and the narrowest deck", () => {
    const pane = Number(
      /--semantic-dimension-size-side-pane: (?<width>\d+)px;/u.exec(TOKENS)
        ?.groups?.["width"]
    );

    const least = pane + NARROWEST_DECK;

    expect(RAIL).toContain(
      ".gg-railed {\n  container: gg-railed / inline-size;"
    );
    expect(STYLESHEET).toContain(
      `@container gg-railed (width >= ${least}px) {\n  .gg-railed:has(.gg-side-pane) > * {`
    );
    expect(STYLESHEET).toContain(
      `@container gg-railed (width < ${least}px) {\n  .gg-side-pane {`
    );
  });
});
