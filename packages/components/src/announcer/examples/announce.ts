import {
  Announcer,
  EmptyState,
  IconButton,
  LiveRegion,
  Rows,
} from "@gjermundgaraba/components";
import { Array, Schema } from "effect";
import type { Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";

export const Model = Schema.Struct({ fileNames: Schema.Array(Schema.String) });

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  ClickedArchive: { fileName: Schema.String },
  CompletedAnnounce: {},
});

export type Message = typeof Message.Type;

export const init = (): Update.Return<Model, Message> => ({
  model: { fileNames: ["field-notes.md", "budget.csv", "garden.md"] },
});

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    ClickedArchive: ({ fileName }) => ({
      model: modifyFields(model, {
        fileNames: Array.filter((name) => name !== fileName),
      }),
      commands: [Announcer.Announce({ text: `Archived ${fileName}.` })],
    }),
    CompletedAnnounce: () => ({ model }),
  });

const fileRowView = (fileName: string, h: HtmlBuilder<Message>): Html =>
  Rows.rowView(
    {
      key: fileName,
      glyph: Rows.glyphView({ name: "page" }, h),
      body: [fileName],
      tools: [
        IconButton.view(
          {
            glyph: "archive",
            label: `Archive ${fileName}`,
            onClick: Message.ClickedArchive({ fileName }),
          },
          h
        ),
      ],
    },
    h
  );

const filesView = (model: Model, h: HtmlBuilder<Message>): Html =>
  Array.match(model.fileNames, {
    onEmpty: () =>
      EmptyState.view({ title: "All archived", headingLevel: "Strong" }, h),
    onNonEmpty: (fileNames) =>
      Rows.view(
        { rows: Array.map(fileNames, (fileName) => fileRowView(fileName, h)) },
        h
      ),
  });

export const view = (model: Model, h: HtmlBuilder<Message>): Html => {
  const liveRegion = LiveRegion.place([], () => LiveRegion.view({}, h));

  return h.div([], [filesView(model, h), ...liveRegion.toPageView()]);
};
