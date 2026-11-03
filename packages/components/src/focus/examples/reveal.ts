import { Button, Field, Focus, Group } from "@gjermundgaraba/components";
import { Schema } from "effect";
import type { Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";

export const Model = Schema.Struct({
  isEditing: Schema.Boolean,
  note: Schema.String,
});

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  ClickedAddNote: {},
  UpdatedNote: { value: Schema.String },
  CompletedFocus: {},
});

export type Message = typeof Message.Type;

export const NOTE_ID = "focus-reveal-note";

export const init = (): Update.Return<Model, Message> => ({
  model: { isEditing: false, note: "" },
});

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    ClickedAddNote: () => ({
      model: modifyFields(model, { isEditing: () => true }),
      commands: [Focus.Focus({ id: NOTE_ID })],
    }),
    UpdatedNote: ({ value }) => ({
      model: modifyFields(model, { note: () => value }),
    }),
    CompletedFocus: () => ({ model }),
  });

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  model.isEditing
    ? Field.view(
        {
          id: NOTE_ID,
          label: "Note",
          value: model.note,
          onInput: (value) => Message.UpdatedNote({ value }),
        },
        h
      )
    : Group.view(
        {
          body: [
            Button.view(
              {
                label: "add a note",
                glyph: "plus",
                onClick: Message.ClickedAddNote(),
              },
              h
            ),
          ],
        },
        h
      );
