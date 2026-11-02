import { Option, Record, Schema } from "effect";
import type { Html, HtmlBuilder } from "foldkit/html";
import * as Update from "foldkit/update";

export type CopyButtonModule<
  ModelSchema extends Schema.Top,
  MessageSchema extends Schema.Top,
  ViewInputs,
  Requirements,
> = Readonly<{
  Model: ModelSchema;
  Message: MessageSchema;
  init: (config: Readonly<{ id: string }>) => ModelSchema["Type"];
  update: (
    model: ModelSchema["Type"],
    message: MessageSchema["Type"]
  ) => Update.Return<ModelSchema["Type"], MessageSchema["Type"], Requirements>;
  embed: <ParentMessage>(
    model: ModelSchema["Type"],
    viewInputs: ViewInputs,
    toParentMessage: (message: MessageSchema["Type"]) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
  ) => Html;
}>;

export const defineCopies = <
  const Key extends string,
  ModelSchema extends Schema.Top,
  MessageSchema extends Schema.Top,
  ViewInputs,
  Requirements,
>(
  keys: readonly Key[],
  button: CopyButtonModule<ModelSchema, MessageSchema, ViewInputs, Requirements>
) => {
  type ButtonModel = ModelSchema["Type"];

  type ButtonMessage = MessageSchema["Type"];

  const Key = Schema.Literals(keys);
  const Model = Schema.Record(Key, button.Model);

  type Model = Readonly<Record<Key, ButtonModel>>;

  const isModel = Schema.is(Model);

  const init = (): Model => {
    const buttons = Record.fromEntries(
      keys.map((key) => [key, button.init({ id: `copy-${key}` })] as const)
    );

    if (!isModel(buttons)) {
      throw new Error("A Copy button is missing from the registry's init.");
    }

    return buttons;
  };

  const fold = <ParentModel, ParentMessage>(config: {
    read: (model: ParentModel) => Model;
    write: (model: ParentModel, nextCopies: Model) => ParentModel;
    toParentMessage: (key: Key, message: ButtonMessage) => ParentMessage;
  }) =>
    Update.foldChildAt({
      update: button.update,
      readAt: (model: ParentModel, key: Key) =>
        Option.some(config.read(model)[key]),
      writeAt: (model: ParentModel, key: Key, nextButton: ButtonModel) =>
        config.write(model, Record.set(config.read(model), key, nextButton)),
      toParentMessage: config.toParentMessage,
    });

  const view = <ParentMessage>(
    model: Model,
    key: Key,
    viewInputs: ViewInputs,
    toParentMessage: (key: Key, message: ButtonMessage) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
  ): Html =>
    button.embed(
      model[key],
      viewInputs,
      (message) => toParentMessage(key, message),
      h
    );

  return { Model, Key, init, fold, view };
};
