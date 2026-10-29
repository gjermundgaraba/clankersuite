import { Button as UiButton } from "@foldkit/ui";
import { Option, Schema } from "effect";
import { constUndefined } from "effect/Function";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";
import { defineView } from "foldkit/submodel";
import * as Update from "foldkit/update";

import { Focus } from "../focus/focus.ts";
import * as InlineInput from "../inline-input/inline-input.ts";

/** Schema for an editable title: its id, and the inline edit while one is open. */
export const Model = Schema.Struct({
  id: Schema.String,
  maybeEdit: Schema.Option(InlineInput.Model),
});

export type Model = typeof Model.Type;

/** Union of all Messages an editable title can produce. */
export const Message = defineMessageUnion({
  ClickedTitle: {},
  GotEditMessage: { message: InlineInput.Message },
  CompletedFocus: {},
});

export type Message = typeof Message.Type;

/** Union of OutMessages an editable title reports: save this text as the title. The edit
 *  holds until the caller reports back with `succeeded` or `failed`. */
export const OutMessage = defineMessageUnion({
  Committed: { text: Schema.String },
});

export type OutMessage = typeof OutMessage.Type;

/** Configuration for creating an editable title with `init`. The `id` must be unique in the
 *  document. */
export type InitConfig = Readonly<{ id: string }>;

/** Creates an editable title, not editing. */
export const init = (config: InitConfig): Model => ({
  id: config.id,
  maybeEdit: Option.none(),
});

/** The title's id, unique in the document. */
export const id = (model: Model): string => model.id;

const titleId = (model: Model): string => `${model.id}-title`;
const fieldId = (model: Model): string => `${model.id}-field`;

type UpdateReturn = Update.ReturnWithOutMessage<Model, Message, OutMessage>;

const foldEditOutMessage = InlineInput.OutMessage.match<
  Update.Step<Model, Message>
>({
  Committed: () => (model) => ({ model }),
  Ended:
    ({ how }) =>
    (model) => {
      const closed = modifyFields(model, { maybeEdit: () => Option.none() });

      return how === "Blur"
        ? { model: closed }
        : { model: closed, commands: [Focus({ id: titleId(model) })] };
    },
});

const toOutMessage = InlineInput.OutMessage.match<OutMessage | undefined>({
  Committed: ({ text }) => OutMessage.Committed({ text }),
  Ended: constUndefined,
});

const editFold = {
  read: (model: Model) => model.maybeEdit,
  write: (model: Model, nextEdit: InlineInput.Model): Model =>
    modifyFields(model, { maybeEdit: () => Option.some(nextEdit) }),
  toParentMessage: (message: InlineInput.Message) =>
    Message.GotEditMessage({ message }),
  toParentOutMessage: toOutMessage,
  foldOutMessage: foldEditOutMessage,
};

const foldEdit = Update.foldChild({ update: InlineInput.update, ...editFold });

const startEdit = (model: Model): UpdateReturn =>
  Update.foldChildInit(InlineInput.init({ id: fieldId(model) }), {
    toParentModel: (edit) =>
      modifyFields(model, { maybeEdit: () => Option.some(edit) }),
    toParentMessage: (message) => Message.GotEditMessage({ message }),
  });

/** Processes an editable title Message and returns the next Model, Commands and OutMessage. */
export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    ClickedTitle: () => startEdit(model),
    GotEditMessage: ({ message: editMessage }) => foldEdit(model, editMessage),
    CompletedFocus: () => ({ model }),
  });

/** The caller's save went through: the edit ends and focus returns to the title, unless the
 *  reader had moved it. */
export const succeeded = (model: Model): UpdateReturn =>
  Update.foldChildStep({
    update: (edit: InlineInput.Model) => InlineInput.succeeded(edit, model.id),
    ...editFold,
  })(model);

/** The caller's save was refused: the edit stays open with its text and says why. */
export const failed = (model: Model, error: string): UpdateReturn =>
  Update.foldChildStep({
    update: (edit: InlineInput.Model) => InlineInput.failed(edit, error),
    ...editFold,
  })(model);

/** Per-render inputs passed to `view` through `h.submodel`'s `viewInputs`. */
export type ViewInputs = Readonly<{
  value: string;
}>;

const titleView = (
  model: Model,
  viewInputs: ViewInputs,
  h: HtmlBuilder<Message>
): Html =>
  UiButton.view(
    {
      onClick: Message.ClickedTitle(),
      toView: (groups) =>
        h.button(
          [...groups.button, h.Id(titleId(model)), h.Class("title-display")],
          [viewInputs.value]
        ),
    },
    h
  );

const editView = (
  model: Model,
  edit: InlineInput.Model,
  viewInputs: ViewInputs,
  h: HtmlBuilder<Message>
): Html =>
  h.div(
    [],
    [
      h.submodel({
        slotId: fieldId(model),
        model: edit,
        view: InlineInput.view,
        viewInputs: { value: viewInputs.value, label: "Title", size: "Title" },
        toParentMessage: (message) => Message.GotEditMessage({ message }),
      }),
      InlineInput.errorView(edit, h),
    ]
  );

/** A card's 16px title that edits in place: a button whose dotted rule on hover says so. A
 *  click opens the field with the title selected; Enter saves, Escape discards, and both put
 *  focus back on the title. Leaving the field saves too, without taking focus back. */
export const view = defineView<Model, Message, ViewInputs>(
  (model, viewInputs, h): Html =>
    Option.match(model.maybeEdit, {
      onNone: () => titleView(model, viewInputs, h),
      onSome: (edit) => editView(model, edit, viewInputs, h),
    })
);
