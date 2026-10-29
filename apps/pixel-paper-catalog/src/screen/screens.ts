import type { KeyHelp, KeyHint } from "@gjermundgaraba/pixel-paper";
import { Array, Option, Schema } from "effect";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";
import * as Subscription from "foldkit/subscription";
import * as Update from "foldkit/update";

import type { CopyKey, CopyView } from "../copies.ts";
import * as ConsentScreen from "./consent.ts";
import * as ConsoleScreen from "./console.ts";
import * as DocumentScreen from "./document.ts";
import * as LibraryScreen from "./library.ts";
import * as NotFoundScreen from "./not-found.ts";
import * as QueueScreen from "./queue.ts";
import * as RefusedScreen from "./refused.ts";
import * as SessionScreen from "./session.ts";
import * as SetupScreen from "./setup.ts";
import * as SignInScreen from "./sign-in.ts";
import { Slug } from "./slugs.ts";
import * as SpacesScreen from "./spaces.ts";
import * as StageScreen from "./stage.ts";
import * as WorkspaceScreen from "./workspace.ts";

export const Model = Schema.Struct({
  queue: QueueScreen.Model,
  document: DocumentScreen.Model,
  console: ConsoleScreen.Model,
  library: LibraryScreen.Model,
  stage: StageScreen.Model,
  workspace: WorkspaceScreen.Model,
  signIn: SignInScreen.Model,
  setup: SetupScreen.Model,
  consent: ConsentScreen.Model,
  session: SessionScreen.Model,
  spaces: SpacesScreen.Model,
});

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  GotQueueMessage: { message: QueueScreen.Message },
  GotDocumentMessage: { message: DocumentScreen.Message },
  GotConsoleMessage: { message: ConsoleScreen.Message },
  GotLibraryMessage: { message: LibraryScreen.Message },
  GotStageMessage: { message: StageScreen.Message },
  GotWorkspaceMessage: { message: WorkspaceScreen.Message },
  GotSignInMessage: { message: SignInScreen.Message },
  GotSetupMessage: { message: SetupScreen.Message },
  GotConsentMessage: { message: ConsentScreen.Message },
  GotSessionMessage: { message: SessionScreen.Message },
  GotSpacesMessage: { message: SpacesScreen.Message },
});

export type Message = typeof Message.Type;

export const init = (): Model => ({
  queue: QueueScreen.init(),
  document: DocumentScreen.init(),
  console: ConsoleScreen.init(),
  library: LibraryScreen.init(),
  stage: StageScreen.init(),
  workspace: WorkspaceScreen.init(),
  signIn: SignInScreen.init(),
  setup: SetupScreen.init(),
  consent: ConsentScreen.init(),
  session: SessionScreen.init(),
  spaces: SpacesScreen.init(),
});

const foldQueue = Update.foldChild({
  update: QueueScreen.update,
  read: (model: Model) => Option.some(model.queue),
  write: (model: Model, nextQueue: QueueScreen.Model): Model =>
    modifyFields(model, { queue: () => nextQueue }),
  toParentMessage: (message: QueueScreen.Message) =>
    Message.GotQueueMessage({ message }),
});

const foldDocument = Update.foldChild({
  update: DocumentScreen.update,
  read: (model: Model) => Option.some(model.document),
  write: (model: Model, nextDocument: DocumentScreen.Model): Model =>
    modifyFields(model, { document: () => nextDocument }),
  toParentMessage: (message: DocumentScreen.Message) =>
    Message.GotDocumentMessage({ message }),
});

const foldConsole = Update.foldChild({
  update: ConsoleScreen.update,
  read: (model: Model) => Option.some(model.console),
  write: (model: Model, nextConsole: ConsoleScreen.Model): Model =>
    modifyFields(model, { console: () => nextConsole }),
  toParentMessage: (message: ConsoleScreen.Message) =>
    Message.GotConsoleMessage({ message }),
});

const foldLibrary = Update.foldChild({
  update: LibraryScreen.update,
  read: (model: Model) => Option.some(model.library),
  write: (model: Model, nextLibrary: LibraryScreen.Model): Model =>
    modifyFields(model, { library: () => nextLibrary }),
  toParentMessage: (message: LibraryScreen.Message) =>
    Message.GotLibraryMessage({ message }),
});

const foldStage = Update.foldChild({
  update: StageScreen.update,
  read: (model: Model) => Option.some(model.stage),
  write: (model: Model, nextStage: StageScreen.Model): Model =>
    modifyFields(model, { stage: () => nextStage }),
  toParentMessage: (message: StageScreen.Message) =>
    Message.GotStageMessage({ message }),
});

const foldWorkspace = Update.foldChild({
  update: WorkspaceScreen.update,
  read: (model: Model) => Option.some(model.workspace),
  write: (model: Model, nextWorkspace: WorkspaceScreen.Model): Model =>
    modifyFields(model, { workspace: () => nextWorkspace }),
  toParentMessage: (message: WorkspaceScreen.Message) =>
    Message.GotWorkspaceMessage({ message }),
});

const foldSignIn = Update.foldChild({
  update: SignInScreen.update,
  read: (model: Model) => Option.some(model.signIn),
  write: (model: Model, nextSignIn: SignInScreen.Model): Model =>
    modifyFields(model, { signIn: () => nextSignIn }),
  toParentMessage: (message: SignInScreen.Message) =>
    Message.GotSignInMessage({ message }),
});

const foldSetup = Update.foldChild({
  update: SetupScreen.update,
  read: (model: Model) => Option.some(model.setup),
  write: (model: Model, nextSetup: SetupScreen.Model): Model =>
    modifyFields(model, { setup: () => nextSetup }),
  toParentMessage: (message: SetupScreen.Message) =>
    Message.GotSetupMessage({ message }),
});

const foldConsent = Update.foldChild({
  update: ConsentScreen.update,
  read: (model: Model) => Option.some(model.consent),
  write: (model: Model, nextConsent: ConsentScreen.Model): Model =>
    modifyFields(model, { consent: () => nextConsent }),
  toParentMessage: (message: ConsentScreen.Message) =>
    Message.GotConsentMessage({ message }),
});

const foldSession = Update.foldChild({
  update: SessionScreen.update,
  read: (model: Model) => Option.some(model.session),
  write: (model: Model, nextSession: SessionScreen.Model): Model =>
    modifyFields(model, { session: () => nextSession }),
  toParentMessage: (message: SessionScreen.Message) =>
    Message.GotSessionMessage({ message }),
});

const foldSpaces = Update.foldChild({
  update: SpacesScreen.update,
  read: (model: Model) => Option.some(model.spaces),
  write: (model: Model, nextSpaces: SpacesScreen.Model): Model =>
    modifyFields(model, { spaces: () => nextSpaces }),
  toParentMessage: (message: SpacesScreen.Message) =>
    Message.GotSpacesMessage({ message }),
});

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    GotQueueMessage: ({ message: screenMessage }) =>
      foldQueue(model, screenMessage),
    GotDocumentMessage: ({ message: screenMessage }) =>
      foldDocument(model, screenMessage),
    GotConsoleMessage: ({ message: screenMessage }) =>
      foldConsole(model, screenMessage),
    GotLibraryMessage: ({ message: screenMessage }) =>
      foldLibrary(model, screenMessage),
    GotStageMessage: ({ message: screenMessage }) =>
      foldStage(model, screenMessage),
    GotWorkspaceMessage: ({ message: screenMessage }) =>
      foldWorkspace(model, screenMessage),
    GotSignInMessage: ({ message: screenMessage }) =>
      foldSignIn(model, screenMessage),
    GotSetupMessage: ({ message: screenMessage }) =>
      foldSetup(model, screenMessage),
    GotConsentMessage: ({ message: screenMessage }) =>
      foldConsent(model, screenMessage),
    GotSessionMessage: ({ message: screenMessage }) =>
      foldSession(model, screenMessage),
    GotSpacesMessage: ({ message: screenMessage }) =>
      foldSpaces(model, screenMessage),
  });

const queueSubscriptions = Subscription.lift(QueueScreen.subscriptions)<
  Model,
  Message
>({
  read: (model) => Option.some(model.queue),
  toParentMessage: (message) => Message.GotQueueMessage({ message }),
});

const librarySubscriptions = Subscription.lift(LibraryScreen.subscriptions)<
  Model,
  Message
>({
  read: (model) => Option.some(model.library),
  toParentMessage: (message) => Message.GotLibraryMessage({ message }),
});

const workspaceSubscriptions = Subscription.lift(WorkspaceScreen.subscriptions)<
  Model,
  Message
>({
  read: (model) => Option.some(model.workspace),
  toParentMessage: (message) => Message.GotWorkspaceMessage({ message }),
});

const documentSubscriptions = Subscription.lift(DocumentScreen.subscriptions)<
  Model,
  Message
>({
  read: (model) => Option.some(model.document),
  toParentMessage: (message) => Message.GotDocumentMessage({ message }),
});

type ViewInputs = Readonly<{
  platform: KeyHint.KeyPlatform;
  maybeNow: Option.Option<number>;
  toLiveRegionView?: (() => Html) | undefined;
  toScreenNavView: () => Html;
  toScreenMenuView: () => Html;
  toCopyView: CopyView;
}>;

type ToParent<ParentMessage> = Readonly<{
  toParentMessage: (message: Message) => ParentMessage;
}>;

type ScreenView = <ParentMessage>(
  model: Model,
  viewInputs: ViewInputs,
  toParent: ToParent<ParentMessage>,
  h: HtmlBuilder<ParentMessage>
) => Html;

export type Layout = "Deck" | "Bare" | "Wall";

type Entry = Readonly<{
  title: string;
  description: string;
  layout: Layout;
  hasOwnHeading?: boolean;
  hasClock?: boolean;
  bindings?: readonly KeyHelp.Binding[];
  subscriptions?: Subscription.Subscriptions<Model, Message>;
  isDialogOpen?: (model: Model) => boolean;
  whenCopied?: Readonly<{ key: CopyKey; note: (model: Model) => Model }>;
  view: ScreenView;
}>;

export const catalog: Readonly<Record<Slug, Entry>> = {
  queue: {
    title: "Queue",
    description:
      "A working list: filters over an outline of groups, or the same items as a board.",
    layout: "Deck",
    hasOwnHeading: true,
    bindings: QueueScreen.bindings,
    subscriptions: queueSubscriptions,
    view: (model, { platform }, { toParentMessage }, h) =>
      h.submodel({
        slotId: "screen-queue",
        model: model.queue,
        view: QueueScreen.view,
        viewInputs: { platform },
        toParentMessage: (message) =>
          toParentMessage(Message.GotQueueMessage({ message })),
      }),
  },
  document: {
    title: "Document",
    description:
      "An authored page at reading pace, with its contents and history.",
    layout: "Deck",
    hasOwnHeading: true,
    subscriptions: documentSubscriptions,
    view: (model, _viewInputs, { toParentMessage }, h) =>
      h.submodel({
        slotId: "screen-document",
        model: model.document,
        view: DocumentScreen.view,
        toParentMessage: (message) =>
          toParentMessage(Message.GotDocumentMessage({ message })),
      }),
  },
  console: {
    title: "Console",
    description:
      "An owner's console: the day's figures, clients, a one-time secret, the issuer, usage.",
    layout: "Deck",
    isDialogOpen: (model) => ConsoleScreen.isDialogOpen(model.console),
    whenCopied: {
      key: "console-secret",
      note: (model) =>
        modifyFields(model, { console: ConsoleScreen.markSecretStored }),
    },
    view: (model, viewInputs, { toParentMessage }, h) =>
      h.submodel({
        slotId: "screen-console",
        model: model.console,
        view: ConsoleScreen.view,
        viewInputs: {
          toLiveRegionView: viewInputs.toLiveRegionView,
          toCopyView: viewInputs.toCopyView,
        },
        toParentMessage: (message) =>
          toParentMessage(Message.GotConsoleMessage({ message })),
      }),
  },
  library: {
    title: "Library",
    description:
      "A rail of places beside the deck; a phone folds it into a drawer.",
    layout: "Bare",
    hasClock: true,
    subscriptions: librarySubscriptions,
    view: (model, viewInputs, { toParentMessage }, h) =>
      h.submodel({
        slotId: "screen-library",
        model: model.library,
        view: LibraryScreen.view,
        viewInputs: {
          platform: viewInputs.platform,
          maybeNow: viewInputs.maybeNow,
          toScreenNavView: viewInputs.toScreenNavView,
          toCopyView: viewInputs.toCopyView,
        },
        toParentMessage: (message) =>
          toParentMessage(Message.GotLibraryMessage({ message })),
      }),
  },
  stage: {
    title: "Stage",
    description: StageScreen.DESCRIPTION,
    layout: "Bare",
    isDialogOpen: (model) => StageScreen.isDialogOpen(model.stage),
    view: (
      model,
      { platform, toScreenMenuView, toLiveRegionView },
      { toParentMessage },
      h
    ) =>
      h.submodel({
        slotId: "screen-stage",
        model: model.stage,
        view: StageScreen.view,
        viewInputs: {
          platform,
          toScreenNavView: toScreenMenuView,
          toLiveRegionView,
        },
        toParentMessage: (message) =>
          toParentMessage(Message.GotStageMessage({ message })),
      }),
  },
  workspace: {
    title: "Workspace",
    description: WorkspaceScreen.DESCRIPTION,
    layout: "Bare",
    hasOwnHeading: true,
    subscriptions: workspaceSubscriptions,
    isDialogOpen: (model) => WorkspaceScreen.isDialogOpen(model.workspace),
    view: (
      model,
      { platform, toScreenMenuView, toLiveRegionView },
      { toParentMessage },
      h
    ) =>
      h.submodel({
        slotId: "screen-workspace",
        model: model.workspace,
        view: WorkspaceScreen.view,
        viewInputs: {
          platform,
          toScreenNavView: toScreenMenuView,
          toLiveRegionView,
        },
        toParentMessage: (message) =>
          toParentMessage(Message.GotWorkspaceMessage({ message })),
      }),
  },
  "sign-in": {
    title: "Sign-in",
    description: "The owner signs in: a whole viewport of ground and one card.",
    layout: "Wall",
    view: (model, _viewInputs, { toParentMessage }, h) =>
      h.submodel({
        slotId: "screen-sign-in",
        model: model.signIn,
        view: SignInScreen.view,
        toParentMessage: (message) =>
          toParentMessage(Message.GotSignInMessage({ message })),
      }),
  },
  setup: {
    title: "Setup",
    description:
      "The first run: nobody owns the service yet, so the first account does.",
    layout: "Wall",
    view: (model, _viewInputs, { toParentMessage }, h) =>
      h.submodel({
        slotId: "screen-setup",
        model: model.setup,
        view: SetupScreen.view,
        toParentMessage: (message) =>
          toParentMessage(Message.GotSetupMessage({ message })),
      }),
  },
  consent: {
    title: "Consent",
    description:
      "A client asks to act for the owner: what it is, what it asks, where it goes.",
    layout: "Wall",
    view: (model, viewInputs, { toParentMessage }, h) =>
      h.submodel({
        slotId: "screen-consent",
        model: model.consent,
        view: ConsentScreen.view,
        viewInputs: { toCopyView: viewInputs.toCopyView },
        toParentMessage: (message) =>
          toParentMessage(Message.GotConsentMessage({ message })),
      }),
  },
  session: {
    title: "Session",
    description:
      "The walls a working screen falls back to: signed out, or the service unavailable.",
    layout: "Wall",
    hasClock: true,
    view: (model, { maybeNow }, { toParentMessage }, h) =>
      h.submodel({
        slotId: "screen-session",
        model: model.session,
        view: SessionScreen.view,
        viewInputs: { maybeNow },
        toParentMessage: (message) =>
          toParentMessage(Message.GotSessionMessage({ message })),
      }),
  },
  refused: {
    title: "Refused",
    description:
      "An authorization that could not be granted, said plainly with its code.",
    layout: "Wall",
    view: (_model, { toCopyView }, _toParent, h) =>
      RefusedScreen.view(toCopyView, h),
  },
  spaces: {
    title: "Spaces",
    description:
      "A landing with no top bar: the places to enter, live or idle, and the palette in the corner.",
    layout: "Wall",
    view: (model, _viewInputs, { toParentMessage }, h) =>
      h.submodel({
        slotId: "screen-spaces",
        model: model.spaces,
        view: SpacesScreen.view,
        toParentMessage: (message) =>
          toParentMessage(Message.GotSpacesMessage({ message })),
      }),
  },
  "not-found": {
    title: "Not-found",
    description:
      "A page that is not there, in a product with no top bar: what was asked for, and the way back.",
    layout: "Wall",
    view: (_model, { toCopyView }, _toParent, h) =>
      NotFoundScreen.view(toCopyView, h),
  },
};

export const view = <ParentMessage>(
  model: Model,
  screen: Slug,
  viewInputs: ViewInputs,
  toParent: ToParent<ParentMessage>,
  h: HtmlBuilder<ParentMessage>
): Html => catalog[screen].view(model, viewInputs, toParent, h);

export const isDialogOpen = (model: Model, screen: Slug): boolean =>
  catalog[screen].isDialogOpen?.(model) ?? false;

export const noteCopied = (model: Model, key: CopyKey): Model =>
  Array.reduce(Slug.literals, model, (current, slug) => {
    const { whenCopied } = catalog[slug];

    return whenCopied?.key === key ? whenCopied.note(current) : current;
  });

export const subscriptionsFor = <ParentModel, ParentMessage>(
  config: Readonly<{
    read: (model: ParentModel) => Model;
    toParentMessage: (message: Message) => ParentMessage;
    isOnShow: (model: ParentModel, screen: Slug) => boolean;
  }>
) =>
  Subscription.aggregate<ParentModel, ParentMessage>()(
    ...Array.flatMap(Slug.literals, (slug) => {
      const { subscriptions } = catalog[slug];

      return subscriptions === undefined
        ? []
        : [
            Subscription.lift(subscriptions)<ParentModel, ParentMessage>({
              read: (model) => Option.some(config.read(model)),
              toParentMessage: config.toParentMessage,
              when: (model) => config.isOnShow(model, slug),
            }),
          ];
    })
  );
