import { FileDrop as UiFileDrop } from "@foldkit/ui";
import { Option, Schema } from "effect";
import * as File from "foldkit/file";
import type { Html } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";
import { defineView } from "foldkit/submodel";
import * as Update from "foldkit/update";

import * as Glyph from "../glyph/glyph.ts";

/** Schema for a drop zone: the `@foldkit/ui` FileDrop it is built on, which knows whether a
 *  file hovers it. */
export const Model = Schema.Struct({
  fileDrop: UiFileDrop.Model,
});

export type Model = typeof Model.Type;

/** Union of all Messages a drop zone can produce. */
export const Message = defineMessageUnion({
  GotFileDropMessage: { message: UiFileDrop.Message },
});

export type Message = typeof Message.Type;

/** Union of OutMessages a drop zone reports: files dropped on it or chosen with its button,
 *  or a drop that held no files (text, a link). */
export const OutMessage = defineMessageUnion({
  ReceivedFiles: { files: Schema.NonEmptyArray(File.File) },
  RejectedNonFiles: {},
});

export type OutMessage = typeof OutMessage.Type;

/** Configuration for creating a drop zone with `init`. The `id` must be unique in the
 *  document: it is the file input's id. */
export type InitConfig = Readonly<{ id: string }>;

/** Creates a drop zone with nothing over it. */
export const init = (config: InitConfig): Model => ({
  fileDrop: UiFileDrop.init({ id: config.id }),
});

/** The drop zone's id, unique in the document: its file input's id. */
export const id = (model: Model): string => model.fileDrop.id;

const foldFileDrop = Update.foldChild({
  update: UiFileDrop.update,
  read: (model: Model) => Option.some(model.fileDrop),
  write: (model: Model, nextFileDrop: UiFileDrop.Model) =>
    modifyFields(model, { fileDrop: () => nextFileDrop }),
  toParentMessage: (message: UiFileDrop.Message) =>
    Message.GotFileDropMessage({ message }),
  toParentOutMessage: UiFileDrop.OutMessage.match<OutMessage>({
    ReceivedFiles: ({ files }) => OutMessage.ReceivedFiles({ files }),
    RejectedNonFiles: () => OutMessage.RejectedNonFiles(),
  }),
});

/** Processes a drop zone Message and returns the next Model, Commands and OutMessage. */
export const update = (model: Model, message: Message) =>
  Message.match<Update.ReturnWithOutMessage<Model, Message, OutMessage>>(
    message,
    {
      GotFileDropMessage: ({ message: fileDropMessage }) =>
        foldFileDrop(model, fileDropMessage),
    }
  );

/** Per-render inputs passed to `view` through `h.submodel`'s `viewInputs`. */
export type ViewInputs = Readonly<{
  /** Pixel caps: `"Drop files here"`. */
  title: string;
  /** One sentence: what happens to what is dropped. Markup here carries no handlers: a
   *  Submodel's viewInputs may hold functions only at the top level. */
  body?: ReadonlyArray<Html | string>;
  /** Under the sentence: a word that says what the last drop did. A function because a
   *  Submodel's viewInputs may hold functions only at the top level, and Foldkit runs this one
   *  in the parent's boundary, so a handler in it (an undo) dispatches the parent's Message. */
  toStatusView?: () => readonly Html[];
}>;

/**
 * A dashed box that goes solid and tinted while a file hovers it, with a button to choose
 * files for those who cannot drag, built on `@foldkit/ui`'s FileDrop: `div.drop-zone`
 * (FileDrop sets `data-drag-over` on it while a file hovers) holding a glyph box, the title
 * and a sentence, and `label.btn.small` around a visually hidden file input, so the button's
 * word is the input's name.
 */
export const view = defineView<Model, Message, ViewInputs>(
  (model, viewInputs, h): Html => {
    const { title, body = [], toStatusView = () => [] } = viewInputs;

    const toView = (groups: UiFileDrop.FileDropAttributes): Html =>
      h.div(
        [...groups.root, h.Class("drop-zone")],
        [
          h.span(
            [h.Class("drop-zone-glyph")],
            [Glyph.view({ name: "upload" }, h)]
          ),
          h.p([], [h.strong([], [title]), ...body]),
          ...toStatusView(),
          h.label(
            [h.Class("btn small")],
            ["choose files", h.input(groups.input)]
          ),
        ]
      );

    return h.submodel({
      slotId: id(model),
      model: model.fileDrop,
      view: UiFileDrop.view,
      viewInputs: { toView, multiple: true },
      toParentMessage: (message) => Message.GotFileDropMessage({ message }),
    });
  }
);
