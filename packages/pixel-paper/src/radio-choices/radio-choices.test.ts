import { RadioGroup as UiRadioGroup } from "@foldkit/ui";
import { Option, Schema } from "effect";
import { Scene, Story, Update } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";
import { describe, it } from "vite-plus/test";

import * as RadioChoices from "./radio-choices.ts";

const Model = Schema.Struct({
  plan: RadioChoices.Model,
  maybePlan: Schema.Option(Schema.String),
});

type Model = typeof Model.Type;

const Message = defineMessageUnion({
  GotPlanMessage: { message: RadioChoices.Message },
});

type Message = typeof Message.Type;

const foldPlan = Update.foldChild({
  update: RadioChoices.update,
  read: (model: Model) => Option.some(model.plan),
  write: (model: Model, nextPlan: RadioChoices.Model): Model =>
    modifyFields(model, { plan: () => nextPlan }),
  toParentMessage: (message) => Message.GotPlanMessage({ message }),
  foldOutMessage: RadioChoices.OutMessage.match<Update.Step<Model, Message>>({
    Selected:
      ({ value }) =>
      (model) => ({
        model: modifyFields(model, { maybePlan: () => Option.some(value) }),
      }),
  }),
});

const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    GotPlanMessage: ({ message: planMessage }) => foldPlan(model, planMessage),
  });

const planView = (model: Model, h: HtmlBuilder<Message>) =>
  h.submodel({
    slotId: RadioChoices.id(model.plan),
    model: model.plan,
    view: RadioChoices.view,
    viewInputs: {
      label: "Plan",
      options: [
        { value: "Monthly", label: "monthly", note: "Billed each month." },
        { value: "Yearly", label: "yearly" },
      ],
      selectedValue: model.maybePlan,
      isInvalid: Option.isNone(model.maybePlan),
    },
    toParentMessage: (message) => Message.GotPlanMessage({ message }),
  });

const monthly = Scene.role("radio", { name: "monthly" });
const yearly = Scene.role("radio", { name: "yearly" });

const focusOption = Scene.Command.resolve(
  UiRadioGroup.FocusOption,
  UiRadioGroup.Message.CompletedFocusOption()
);

describe("RadioChoices update", () => {
  it("reports the chosen option and puts focus on it", () => {
    const plan = RadioChoices.init({ id: "plan" });

    Story.story(
      RadioChoices.update,
      Story.given(plan),
      Story.message(
        RadioChoices.Message.GotRadioGroupMessage({
          message: UiRadioGroup.Message.SelectedOption({
            index: 1,
            value: "Yearly",
          }),
        })
      ),
      Story.expectOutMessage(
        RadioChoices.OutMessage.Selected({ value: "Yearly" })
      ),
      Story.Command.resolve(
        UiRadioGroup.FocusOption,
        UiRadioGroup.Message.CompletedFocusOption()
      )
    );
  });
});

describe("RadioChoices view", () => {
  it("is a named radiogroup whose checked option follows the parent's choice", () => {
    const plan = RadioChoices.init({ id: "plan" });

    Scene.scene(
      { update, view: planView },
      Scene.given<Model>({ plan, maybePlan: Option.none() }),
      Scene.expect(Scene.role("radiogroup", { name: "Plan" })).toHaveClass(
        "choices"
      ),
      Scene.expect(Scene.role("radiogroup", { name: "Plan" })).toHaveAttr(
        "aria-invalid",
        "true"
      ),
      Scene.expect(monthly).toHaveClass("choice"),
      Scene.expect(monthly).toHaveAttr("id", RadioChoices.firstOptionId(plan)),
      Scene.expect(monthly).toHaveAttr("aria-checked", "false"),
      Scene.expect(monthly).not.toHaveAttr("aria-invalid"),
      Scene.expect(monthly).toHaveAttr("aria-describedby"),
      Scene.expect(yearly).not.toHaveAttr("aria-describedby"),
      Scene.click(yearly),
      focusOption,
      Scene.expect(yearly).toHaveAttr("aria-checked", "true"),
      Scene.expect(Scene.role("radiogroup", { name: "Plan" })).not.toHaveAttr(
        "aria-invalid"
      )
    );
  });

  it("chooses an option from a click on its name", () => {
    Scene.scene(
      { update, view: planView },
      Scene.given<Model>({
        plan: RadioChoices.init({ id: "plan" }),
        maybePlan: Option.some("Yearly"),
      }),
      Scene.click(Scene.selector(".choice-name")),
      Scene.Command.expectHas(
        UiRadioGroup.FocusOption({ id: "plan", index: 0 })
      ),
      focusOption,
      Scene.expect(monthly).toHaveAttr("aria-checked", "true")
    );
  });
});
