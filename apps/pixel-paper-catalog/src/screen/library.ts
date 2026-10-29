import {
  CodeSurface,
  Crumbs,
  Deck,
  FileTree,
  History,
  LinkState,
  Panel,
  Places,
  PropsList,
  Rail,
  StatusBar,
  Time,
} from "@gjermundgaraba/pixel-paper";
import type { KeyHint } from "@gjermundgaraba/pixel-paper";
import { Array, Option, Schema, String } from "effect";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";
import { defineView } from "foldkit/submodel";
import * as Subscription from "foldkit/subscription";
import * as Update from "foldkit/update";

import type { CopyView } from "../copies.ts";
import { screenUrl } from "../route.ts";
import { FILES, VERSIONS, fileBody } from "../sample.ts";
import { SITE_KEY_NOTES } from "../site-keys.ts";

export const Model = Schema.Struct({
  rail: Rail.Model,
  maybeRailWidth: Schema.Option(Schema.Finite),
  isRailHidden: Schema.Boolean,
  fileTree: FileTree.Model,
  openPath: Schema.String,
  set: Schema.String,
});

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  GotStatusBarMessage: { message: StatusBar.Message },
  GotRailMessage: { message: Rail.Message },
  GotFileTreeMessage: { message: FileTree.Message },
  SelectedSet: { name: Schema.String },
});

export type Message = typeof Message.Type;

export const init = (): Model => ({
  rail: Rail.init({ id: "library-rail" }),
  maybeRailWidth: Option.none(),
  isRailHidden: false,
  fileTree: FileTree.init({ id: "library-files" }),
  openPath: "service.toml",
  set: "deploy",
});

const railFold = {
  read: (model: Model) => Option.some(model.rail),
  write: (model: Model, nextRail: Rail.Model): Model =>
    modifyFields(model, { rail: () => nextRail }),
  toParentMessage: (message: Rail.Message) =>
    Message.GotRailMessage({ message }),
};

const foldRail = Update.foldChild({
  update: Rail.update,
  ...railFold,
  foldOutMessage: Rail.OutMessage.match<Update.Step<Model, Message>>({
    ResizedRail:
      ({ width }) =>
      (model) => ({
        model: modifyFields(model, {
          maybeRailWidth: () => Option.some(width),
        }),
      }),
    ToggledRail: () => (model) => ({
      model: modifyFields(model, { isRailHidden: (isHidden) => !isHidden }),
    }),
  }),
});

const foldRailClose = Update.foldChildStep({ update: Rail.close, ...railFold });

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
      (model) =>
        foldRailClose(modifyFields(model, { openPath: () => path })),
  }),
});

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    GotStatusBarMessage: () => ({ model }),
    GotRailMessage: ({ message: railMessage }) => foldRail(model, railMessage),
    GotFileTreeMessage: ({ message: fileTreeMessage }) =>
      foldFileTree(model, fileTreeMessage),
    SelectedSet: ({ name }) =>
      foldRailClose(modifyFields(model, { set: () => name })),
  });

export const subscriptions = Subscription.lift(
  Rail.subscriptions("libraryRail")
)<Model, Message>({
  read: (model) => Option.some(model.rail),
  toParentMessage: (message) => Message.GotRailMessage({ message }),
});

export type ViewInputs = Readonly<{
  platform: KeyHint.KeyPlatform;
  maybeNow: Option.Option<number>;
  toScreenNavView: () => Html;
  toCopyView: CopyView;
}>;

const SETS: ReadonlyArray<Readonly<{ name: string; count: number }>> = [
  { name: "deploy", count: 3 },
  { name: "notices", count: 1 },
  { name: "everything", count: 5 },
];

const CHANGED_AT = Date.UTC(2026, 8, 25, 9, 12);

const filesPanelView = (
  model: Model,
  toggle: Html,
  h: HtmlBuilder<Message>
): Html =>
  Panel.view(
    {
      id: "library-files-panel",
      title: "Files",
      meta: "5",
      lead: [toggle],
      isFlush: true,
      body: [
        h.submodel({
          slotId: FileTree.id(model.fileTree),
          model: model.fileTree,
          view: FileTree.view,
          viewInputs: {
            label: "Sample files",
            nodes: FILES,
            currentPath: model.openPath,
          },
          toParentMessage: (message) => Message.GotFileTreeMessage({ message }),
        }),
      ],
    },
    h
  );

const setsPanelView = (model: Model, h: HtmlBuilder<Message>): Html =>
  Panel.view(
    {
      id: "library-sets",
      title: "Sets",
      meta: `${SETS.length}`,
      isFlush: true,
      body: [
        Places.view(
          {
            label: "Sample sets",
            places: Array.map(SETS, ({ name, count }) => ({
              id: name,
              label: name,
              count,
              isCurrent: model.set === name,
              onSelect: Message.SelectedSet({ name }),
            })),
          },
          h
        ),
      ],
    },
    h
  );

const asideView = (
  model: Model,
  toggle: Html,
  h: HtmlBuilder<Message>
): readonly Html[] => [
  filesPanelView(model, toggle, h),
  setsPanelView(model, h),
];

const crumbsView = (openPath: string, h: HtmlBuilder<Message>): Html => {
  const segments = String.split(openPath, "/");

  return Crumbs.view(
    {
      crumbs: [
        { label: "library", href: screenUrl("library") },
        ...Array.map(Array.dropRight(segments, 1), (segment) => ({
          label: segment,
          href: screenUrl("library"),
        })),
        { label: Array.lastNonEmpty(segments) },
      ],
    },
    h
  );
};

const openFileView = (
  model: Model,
  viewInputs: ViewInputs,
  h: HtmlBuilder<Message>
): Html =>
  Panel.view(
    {
      id: "library-open-file",
      title: model.openPath,
      meta: "v4",
      body: [
        PropsList.view(
          {
            items: [
              {
                label: "path",
                value: [model.openPath],
                isCode: true,
                actions: [
                  viewInputs.toCopyView("library-path", {
                    text: model.openPath,
                    label: "Copy path",
                  }),
                ],
              },
              { label: "in set", value: [model.set] },
            ],
          },
          h
        ),
        CodeSurface.view(
          { label: model.openPath, body: [fileBody(model.openPath)] },
          h
        ),
      ],
      foot: [
        h.span(
          [h.Class("note-line")],
          [
            "Changed ",
            Time.view(
              { at: CHANGED_AT, format: "Ago", maybeNow: viewInputs.maybeNow },
              h
            ),
            " by sam.",
          ]
        ),
      ],
    },
    h
  );

const deckView = (
  model: Model,
  viewInputs: ViewInputs,
  openButton: Html,
  h: HtmlBuilder<Message>
): Html =>
  Deck.view(
    {
      body: [
        openButton,
        viewInputs.toScreenNavView(),
        crumbsView(model.openPath, h),
        openFileView(model, viewInputs, h),
        Panel.view(
          {
            id: "library-history",
            title: "History",
            meta: `${VERSIONS.length}`,
            body: [
              History.view({ entries: VERSIONS, label: "Sample versions" }, h),
            ],
          },
          h
        ),
      ],
    },
    h
  );

export const view = defineView<Model, Message, ViewInputs>(
  (model, viewInputs, h): Html =>
    h.div(
      [h.Class("spec-bare")],
      [
        h.submodel({
          slotId: Rail.id(model.rail),
          model: model.rail,
          view: Rail.view,
          viewInputs: {
            label: "Library",
            maybeWidth: model.maybeRailWidth,
            isHidden: model.isRailHidden,
            maybeToggleKeyHint: Option.none(),
            toAsideView: (toggle) => asideView(model, toggle, h),
            toDeckView: (openButton) =>
              deckView(model, viewInputs, openButton, h),
          },
          toParentMessage: (message) => Message.GotRailMessage({ message }),
        }),
        StatusBar.view(
          {
            body: [LinkState.view({ state: "Online", label: "connected" }, h)],
            keys: SITE_KEY_NOTES,
            platform: viewInputs.platform,
            toParentMessage: (message) =>
              Message.GotStatusBarMessage({ message }),
          },
          h
        ),
      ]
    )
);
