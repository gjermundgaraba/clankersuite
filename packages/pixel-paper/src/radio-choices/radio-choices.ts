import { RadioGroup as UiRadioGroup } from "@foldkit/ui";
import { Array, Option, Schema } from "effect";
import type { Html } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";
import { defineView } from "foldkit/submodel";
import * as Update from "foldkit/update";

/** Schema for a radio choice: the `@foldkit/ui` RadioGroup it is built on, which keeps where
 *  keyboard focus is. The selected value is the parent's, passed in as `selectedValue`. */
export const Model = Schema.Struct({ radioGroup: UiRadioGroup.Model });

export type Model = typeof Model.Type;

/** Union of all Messages a radio choice can produce. */
export const Message = defineMessageUnion({
  GotRadioGroupMessage: { message: UiRadioGroup.Message },
});

export type Message = typeof Message.Type;

/** Union of OutMessages a radio choice reports to its parent: an option was chosen, by a
 *  click anywhere on it, Space, or an arrow key. The parent stores `value`. */
export const OutMessage = defineMessageUnion({
  Selected: { value: Schema.String },
});

export type OutMessage = typeof OutMessage.Type;

/** Configuration for creating a radio choice with `init`. The `id` must be unique in the
 *  document. */
export type InitConfig = Readonly<{ id: string }>;

/** Creates a radio choice whose keyboard focus follows its selection. */
export const init = (config: InitConfig): Model => ({
  radioGroup: UiRadioGroup.init({ id: config.id }),
});

/** The radio choice's id, unique in the document. */
export const id = (model: Model): string => model.radioGroup.id;

const RadioGroup = UiRadioGroup.create();

const foldRadioGroup = Update.foldChild({
  update: RadioGroup.update,
  read: (model: Model) => Option.some(model.radioGroup),
  write: (model: Model, nextRadioGroup: UiRadioGroup.Model) =>
    modifyFields(model, { radioGroup: () => nextRadioGroup }),
  toParentMessage: (message: UiRadioGroup.Message) =>
    Message.GotRadioGroupMessage({ message }),
  toParentOutMessage: UiRadioGroup.OutMessage.match<OutMessage>({
    Selected: ({ value }) => OutMessage.Selected({ value }),
  }),
});

/** Processes a radio choice Message and returns the next Model, Commands and OutMessage. */
export const update = (model: Model, message: Message) =>
  Message.match<Update.ReturnWithOutMessage<Model, Message, OutMessage>>(
    message,
    {
      GotRadioGroupMessage: ({ message: radioGroupMessage }) =>
        foldRadioGroup(model, radioGroupMessage),
    }
  );

/** One option: its value, its name in pixel caps, and an optional sans note under it. */
export type RadioOption = Readonly<{
  value: string;
  label: string;
  note?: string;
}>;

/** Per-render inputs passed to `view` through `h.submodel`'s `viewInputs`. */
export type ViewInputs = Readonly<{
  /** Names the group for screen readers; a Fieldset around it says it on the page. */
  label: string;
  options: readonly RadioOption[];
  /** The parent's selection. */
  selectedValue: Option.Option<string>;
}>;

/**
 * A choice of one, built on `@foldkit/ui`'s RadioGroup: a `role="radiogroup"` of
 * `role="radio"` options (`aria-checked`), each a button holding its mark, its name and its
 * note, named by the name and described by the note, so a click anywhere on it chooses it.
 * One stop for Tab, and the arrows move the selection. Its mark is a diamond, so a single
 * choice reads apart from a checkbox.
 */
export const view = defineView<Model, Message, ViewInputs>(
  (model, viewInputs, h): Html => {
    const { label, options, selectedValue } = viewInputs;

    const optionView = (
      option: RadioOption,
      info: UiRadioGroup.OptionInfo
    ): Html =>
      h.keyed("button")(
        info.value,
        [...info.option, h.Class("choice")],
        [
          h.span([h.Class("choice-box")]),
          h.span(
            [],
            [
              h.span([...info.label, h.Class("choice-name")], [option.label]),
              ...(option.note === undefined
                ? []
                : [
                    h.span(
                      [...info.description, h.Class("choice-note")],
                      [option.note]
                    ),
                  ]),
            ]
          ),
        ]
      );

    return h.submodel({
      slotId: id(model),
      model: model.radioGroup,
      view: RadioGroup.view,
      viewInputs: {
        options: Array.map(options, ({ value }) => value),
        selectedValue,
        ariaLabel: label,
        orientation: "Vertical",
        hasOptionDescription: (value) =>
          Array.some(
            options,
            (option) => option.value === value && option.note !== undefined
          ),
        toView: (render) =>
          h.div(
            [...render.group, h.Class("choices")],
            Array.zipWith(options, render.options, optionView)
          ),
      },
      toParentMessage: (message) => Message.GotRadioGroupMessage({ message }),
    });
  }
);
