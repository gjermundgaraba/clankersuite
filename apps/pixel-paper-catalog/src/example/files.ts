import {
  Announcer,
  DropZone,
  FileTree,
  FlashWord,
} from "@gjermundgaraba/pixel-paper";
import { Option, Schema } from "effect";
import type { Html } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";
import { defineView } from "foldkit/submodel";
import * as Update from "foldkit/update";

import type { CopyView } from "../copies.ts";
import * as HeldWord from "../held-word.ts";
import { rowView, specView } from "../spec.ts";

export const Model = Schema.Struct({
  fileTree: FileTree.Model,
  currentPath: Schema.String,
  dropZone: DropZone.Model,
  receivedWord: HeldWord.Model,
});

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  GotFileTreeMessage: { message: FileTree.Message },
  GotDropZoneMessage: { message: DropZone.Message },
  CompletedAnnounce: {},
  GotReceivedWordMessage: { message: HeldWord.Message },
});

export type Message = typeof Message.Type;

export const init = (): Model => ({
  fileTree: FileTree.init({ id: "sample-files", folded: ["config/keys"] }),
  currentPath: "config/app.toml",
  dropZone: DropZone.init({ id: "sample-uploads" }),
  receivedWord: HeldWord.init(),
});

const foldFileTree = Update.foldChild({
  update: FileTree.update,
  read: (model: Model) => Option.some(model.fileTree),
  write: (model: Model, nextFileTree: FileTree.Model): Model =>
    modifyFields(model, { fileTree: () => nextFileTree }),
  toParentMessage: (message: FileTree.Message) =>
    Message.GotFileTreeMessage({ message }),
  foldOutMessage: FileTree.OutMessage.match<Update.Step<Model, Message>>({
    OpenedFile:
      ({ path }) =>
      (model) => ({ model: modifyFields(model, { currentPath: () => path }) }),
  }),
});

const filesWord = (count: number): string =>
  count === 1 ? "1 file" : `${count} files`;

const receivedWordFold = {
  read: (model: Model) => Option.some(model.receivedWord),
  write: (model: Model, receivedWord: HeldWord.Model): Model =>
    modifyFields(model, { receivedWord: () => receivedWord }),
  toParentMessage: (message: HeldWord.Message) =>
    Message.GotReceivedWordMessage({ message }),
};

const showReceivedWord = Update.foldChild({
  update: HeldWord.show,
  ...receivedWordFold,
});

const foldReceivedWord = Update.foldChild({
  update: HeldWord.update,
  ...receivedWordFold,
});

const foldDropZone = Update.foldChild({
  update: DropZone.update,
  read: (model: Model) => Option.some(model.dropZone),
  write: (model: Model, nextDropZone: DropZone.Model): Model =>
    modifyFields(model, { dropZone: () => nextDropZone }),
  toParentMessage: (message: DropZone.Message) =>
    Message.GotDropZoneMessage({ message }),
  foldOutMessage: DropZone.OutMessage.match<Update.Step<Model, Message>>({
    ReceivedFiles:
      ({ files }) =>
      (model) =>
        showReceivedWord(model, `${filesWord(files.length)} received (sample)`),
    RejectedNonFiles: () => (model) => ({
      model,
      commands: [
        Announcer.Announce({ text: "Only files can be dropped here." }),
      ],
    }),
  }),
});

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    GotFileTreeMessage: ({ message: fileTreeMessage }) =>
      foldFileTree(model, fileTreeMessage),
    GotDropZoneMessage: ({ message: dropZoneMessage }) =>
      foldDropZone(model, dropZoneMessage),
    CompletedAnnounce: () => ({ model }),
    GotReceivedWordMessage: ({ message: wordMessage }) =>
      foldReceivedWord(model, wordMessage),
  });

const NODES: readonly FileTree.FileNode[] = [
  {
    name: "config",
    path: "config",
    children: [
      { name: "app.toml", path: "config/app.toml", tag: "main" },
      { name: "routes.toml", path: "config/routes.toml" },
      {
        name: "keys",
        path: "config/keys",
        children: [
          { name: "deploy.pem", path: "config/keys/deploy.pem", glyph: "key" },
        ],
      },
    ],
  },
  { name: "README.md", path: "README.md", glyph: "note" },
];

const SAMPLE_LINK = "https://example.com/share/sample";
const SAMPLE_COMMAND = "vp run pixel-paper#dev";

export type ViewInputs = Readonly<{ toCopyView: CopyView }>;

export const view = defineView<Model, Message, ViewInputs>(
  (model, { toCopyView }, h): Html =>
    h.div(
      [h.Class("spec-rows")],
      [
        rowView(
          [
            specView(
              `a file tree: ${model.currentPath} is open (sample); arrows move, right and left fold`,
              [
                h.submodel({
                  slotId: FileTree.id(model.fileTree),
                  model: model.fileTree,
                  view: FileTree.view,
                  viewInputs: {
                    label: "Files in sample project",
                    nodes: NODES,
                    currentPath: model.currentPath,
                  },
                  toParentMessage: (message) =>
                    Message.GotFileTreeMessage({ message }),
                }),
              ],
              h
            ),
            specView(
              "copy: the glyph turns to a check, the button's word to copied",
              [
                h.span(
                  [h.Class("spec-inline")],
                  [
                    h.code([], [SAMPLE_LINK]),
                    toCopyView("files-link", {
                      text: SAMPLE_LINK,
                      label: "Copy link",
                    }),
                  ]
                ),
                h.span(
                  [h.Class("spec-inline")],
                  [
                    h.code([], [SAMPLE_COMMAND]),
                    toCopyView("files-command", {
                      text: SAMPLE_COMMAND,
                      label: "copy",
                      variant: "Button",
                    }),
                  ]
                ),
              ],
              h
            ),
          ],
          h
        ),
        specView(
          "a drop zone: dashed while waiting, solid while a file hovers",
          [
            h.submodel({
              slotId: DropZone.id(model.dropZone),
              model: model.dropZone,
              view: DropZone.view,
              viewInputs: {
                title: "Drop files here",
                body: ["They are counted and put nowhere (sample)."],
                toStatusView: () => [
                  FlashWord.view(
                    { maybeWord: HeldWord.maybeWord(model.receivedWord) },
                    h
                  ),
                ],
              },
              toParentMessage: (message) =>
                Message.GotDropZoneMessage({ message }),
            }),
          ],
          h
        ),
      ]
    )
);
