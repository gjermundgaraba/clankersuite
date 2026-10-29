import { Array, Predicate, Schema, String, pipe } from "effect";
import type { KeySequence } from "foldkit/dom";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";
import { defineView } from "foldkit/submodel";
import type * as Update from "foldkit/update";

import * as Button from "../button/button.ts";
import * as Card from "../card/card.ts";
import * as Dialog from "../dialog/dialog.ts";
import { foldDialog } from "../dialog/fold.ts";
import * as Field from "../field/field.ts";
import { keyLabel, pressesOf } from "../key-hint/key-label.ts";
import type { KeyPlatform } from "../key-hint/key-label.ts";
import * as Keymap from "../keymap/keymap.ts";

/** Schema for the key help: its Dialog and the words in its find field. */
export const Model = Schema.Struct({
  dialog: Dialog.Model,
  query: Schema.String,
});

export type Model = typeof Model.Type;

/** One command the keyboard gives, as the help lists it: the keys that give it (any of
 *  them), the heading it sits under (`"Move"`, `"Edit"`) and what it does (`"Next item"`).
 *  Describe the same bindings the application hands `Dom.streamFromKeyBindings`, so a key
 *  never says one thing and does another. */
export type Binding = Readonly<{
  keys: readonly KeySequence[];
  group: string;
  does: string;
}>;

/** The key that opens the help, `?`, which the application binds. */
export const HELP_KEYS: KeySequence = "Shift+?";

/** The help's own line in its listing. */
export const helpBinding: Binding = {
  keys: [HELP_KEYS],
  group: "Help",
  does: "These keys",
};

/** Union of all Messages the key help can produce. */
export const Message = defineMessageUnion({
  GotDialogMessage: { message: Dialog.Message },
  UpdatedQuery: { value: Schema.String },
  PressedHelpKey: {},
});

export type Message = typeof Message.Type;

/** Union of OutMessages the key help reports: the reader closed it (Escape, a click on the
 *  veil, a close button). Opening it, by `?` or `open`, reports nothing. */
export const OutMessage = defineMessageUnion({
  Closed: {},
});

export type OutMessage = typeof OutMessage.Type;

/** Configuration for creating the key help with `init`. */
export type InitConfig = Readonly<{ id: string }>;

/** Creates the key help, closed. */
export const init = (config: InitConfig): Model => ({
  dialog: Dialog.init({ id: config.id }),
  query: "",
});

const toOutMessage = Dialog.OutMessage.match<OutMessage>({
  Closed: () => OutMessage.Closed(),
});

const dialogFold = foldDialog(Dialog, {
  read: (model: Model) => model.dialog,
  write: (model: Model, nextDialog: Dialog.Model): Model =>
    modifyFields(model, { dialog: () => nextDialog }),
  toParentMessage: (message: Dialog.Message) =>
    Message.GotDialogMessage({ message }),
  toParentOutMessage: toOutMessage,
});

const clearQuery = (model: Model): Model =>
  modifyFields(model, { query: () => "" });

/** Processes a key help Message and returns the next Model, Commands and OutMessage. */
export const update = (model: Model, message: Message) =>
  Message.match<Update.ReturnWithOutMessage<Model, Message, OutMessage>>(
    message,
    {
      GotDialogMessage: ({ message: dialogMessage }) =>
        dialogFold.update(model, dialogMessage),
      UpdatedQuery: ({ value }) => ({
        model: modifyFields(model, { query: () => value }),
      }),
      PressedHelpKey: () => dialogFold.open(clearQuery(model)),
    }
  );

/** Opens the key help, as `?` does: for a button or a command palette entry. */
export const open = (model: Model): Update.Return<Model, Message> =>
  dialogFold.open(clearQuery(model));

/** The key help's id, unique in the document. */
export const id = (model: Model): string => Dialog.id(model.dialog);

/** Whether the key help is open. */
export const isOpen = (model: Model): boolean => Dialog.isOpen(model.dialog);

const isFound = (binding: Binding, labels: string, query: string): boolean =>
  pipe(
    [
      labels,
      ...Array.flatMap(binding.keys, pressesOf),
      binding.does,
      binding.group,
    ],
    Array.join(" "),
    String.toLowerCase,
    String.includes(query)
  );

/** The bindings as a keymap: under their groups in the order the groups first appear, each
 *  binding's keys printed for the platform, filtered by the query (its keys or its words). */
export const toKeymapGroups = (
  bindings: readonly Binding[],
  platform: KeyPlatform,
  query: string
): readonly Keymap.KeymapGroup[] => {
  const normalizedQuery = pipe(query, String.trim, String.toLowerCase);

  const rows = pipe(
    bindings,
    Array.map((binding) => ({
      binding,
      labels: Array.join(
        Array.map(binding.keys, (keys) => keyLabel(keys, platform)),
        " / "
      ),
    })),
    Array.filter(({ binding, labels }) =>
      isFound(binding, labels, normalizedQuery)
    ),
    Array.map(({ binding, labels }) => ({
      group: binding.group,
      row: { keys: labels, does: binding.does },
    }))
  );

  const groups = Array.dedupe(Array.map(rows, ({ group }) => group));

  return Array.map(groups, (group) => ({
    title: group,
    rows: pipe(
      rows,
      Array.filter((row) => row.group === group),
      Array.map(({ row }) => row)
    ),
  }));
};

/** Per-render inputs passed to `view` through `h.submodel`'s `viewInputs`. */
export type ViewInputs = Readonly<{
  /** Every key in force now. The help adds its own `?` line. */
  bindings: readonly Binding[];
  platform: KeyPlatform;
  /** The application's own words above the find field: what the page would say that the
   *  reader still needs while the help covers it (a sync notice and its retry). A slot that
   *  may carry the application's handlers, so a function. */
  toIntroView?: () => ReadonlyArray<Html | string>;
  /** The page's live region and toasts while this is the topmost open dialog, `undefined`
   *  while it is not (see `Dialog`). */
  toLiveRegionView?: (() => Html) | undefined;
}>;

const NOTE = "Keys wait while you type in a field.";

const SEQUENCE_NOTE =
  " Type the keys of a sequence one straight after the other; any other key lets go of the first.";

const NOTHING_FOUND = "No key does that.";

const hasSequence = (bindings: readonly Binding[]): boolean =>
  Array.some(bindings, (binding) =>
    Array.some(binding.keys, (keys) => !Predicate.isString(keys))
  );

const cardView = (
  model: Model,
  viewInputs: ViewInputs,
  render: Dialog.RenderInfo,
  h: HtmlBuilder<Message>
): Html => {
  const bindings = [...viewInputs.bindings, helpBinding];
  const groups = toKeymapGroups(bindings, viewInputs.platform, model.query);

  const note = Array.match(groups, {
    onEmpty: () => NOTHING_FOUND,
    onNonEmpty: () =>
      hasSequence(bindings) ? `${NOTE}${SEQUENCE_NOTE}` : NOTE,
  });

  return Card.view(
    {
      title: "Keys",
      titleAttributes: render.title,
      isNarrow: true,
      closeAttributes: render.closeButton,
      actionBarAttributes: render.actionBar,
      actions: [
        Button.view({ label: "close", attributes: render.closeButton }, h),
      ],
      body: [
        ...(viewInputs.toIntroView?.() ?? []),
        Field.view(
          {
            id: `${id(model)}-find`,
            label: "Find a key",
            value: model.query,
            onInput: (value) => Message.UpdatedQuery({ value }),
            inputAttributes: render.initialFocus,
          },
          h
        ),
        Keymap.view({ groups, note }, h),
      ],
    },
    h
  );
};

/** The keyboard's help: every key in force, under its group, with a field that finds one by
 *  its keys or its words. `open` opens it, from `HELP_KEYS` or a button. Render it
 *  once per page. */
export const view = defineView<Model, Message, ViewInputs>(
  (model, viewInputs, h): Html =>
    h.submodel({
      slotId: id(model),
      model: model.dialog,
      view: Dialog.view,
      viewInputs: {
        toLiveRegionView: viewInputs.toLiveRegionView,
        toView: (render) => cardView(model, viewInputs, render, h),
      },
      toParentMessage: (message) => Message.GotDialogMessage({ message }),
    })
);
