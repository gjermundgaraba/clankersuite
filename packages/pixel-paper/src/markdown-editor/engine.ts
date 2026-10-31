import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { commonmarkLanguage, markdownKeymap } from "@codemirror/lang-markdown";
import { Language } from "@codemirror/language";
import { diff } from "@codemirror/merge";
import { Compartment, EditorState, Prec, Transaction } from "@codemirror/state";
import type { Extension } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { GFM, MarkdownParser } from "@lezer/markdown";

import { liveMarkdown } from "./live/live.ts";
import { withLfLineEndings } from "./reconcile.ts";

const DIFF_TIMEOUT_MS = 50;

const historyCompartment = new Compartment();

const language = new Language(
  commonmarkLanguage.data,
  commonmarkLanguage.parser instanceof MarkdownParser
    ? commonmarkLanguage.parser.configure(GFM)
    : commonmarkLanguage.parser,
  [],
  "markdown"
);

/** Who is named by what, and whether the document may change. `readOnly` alone lets Enter and
 *  the Markdown keymap edit, so the filter refuses every change but an outside one. */
export const accessExtension = (
  attributes: Readonly<Record<string, string>>,
  isReadOnly: boolean
): Extension => [
  EditorState.readOnly.of(isReadOnly),
  ...(isReadOnly
    ? [
        EditorState.changeFilter.of(
          (transaction) => transaction.annotation(Transaction.remote) === true
        ),
      ]
    : []),
  EditorView.contentAttributes.of({
    ...attributes,
    ...(isReadOnly ? { "aria-disabled": "true" } : {}),
  }),
];

/** The editor's state. No line separator is set, so CRLF text parses like LF text. Tab stays
 *  unbound, so it leaves the field. */
export const editorState = (
  doc: string,
  extensions: Extension = []
): EditorState =>
  EditorState.create({
    doc,
    extensions: [
      historyCompartment.of(history()),
      language,
      liveMarkdown(),
      Prec.high(keymap.of(markdownKeymap)),
      keymap.of([...defaultKeymap, ...historyKeymap]),
      EditorView.lineWrapping,
      EditorView.contentAttributes.of({
        spellcheck: "true",
        autocorrect: "on",
        autocapitalize: "sentences",
      }),
      extensions,
    ],
  });

/** The whole document to send up after these transactions, if one of them was a local edit. */
export const emission = (
  transactions: readonly Transaction[],
  state: EditorState
): string | undefined =>
  transactions.some(
    (transaction) =>
      transaction.docChanged &&
      transaction.annotation(Transaction.remote) !== true
  )
    ? state.doc.toString()
    : undefined;

/** What holds an editor's state and takes its transactions: the view, or a test's stand-in. */
export type EditorTarget = Readonly<{
  state: EditorState;
  dispatch: (transaction: Transaction) => void;
}>;

/** Puts an outside value in as a minimal edit, so the caret stays on the same text, and ends
 *  the undo history. Typed edits left in it would map onto letters of the outside text, and
 *  undo would delete those. Dropping the history field and adding it back starts it empty. */
export const applyExternal = (target: EditorTarget, source: string): void => {
  const current = target.state.doc.toString();
  const next = withLfLineEndings(source);

  target.dispatch(
    target.state.update({
      changes: diff(current, next, { timeout: DIFF_TIMEOUT_MS }).map(
        ({ fromA, toA, fromB, toB }) => ({
          from: fromA,
          to: toA,
          insert: next.slice(fromB, toB),
        })
      ),
      annotations: Transaction.remote.of(true),
      effects: historyCompartment.reconfigure([]),
    })
  );

  target.dispatch(
    target.state.update({
      effects: historyCompartment.reconfigure(history()),
    })
  );
};

/** What the element gives the engine at mount. */
export type EngineConfig = Readonly<{
  parent: HTMLElement;
  doc: string;
  attributes: Readonly<Record<string, string>>;
  isReadOnly: boolean;
  onLocalChange: (doc: string) => void;
}>;

/** Mounts CodeMirror in `parent`, and returns what the element drives it with. */
export const createEngine = (config: EngineConfig) => {
  const access = new Compartment();

  const view = new EditorView({
    parent: config.parent,
    state: editorState(config.doc, [
      access.of(accessExtension(config.attributes, config.isReadOnly)),
      EditorView.updateListener.of((update) => {
        const doc = emission(update.transactions, update.state);

        if (doc !== undefined) {
          config.onLocalChange(doc);
        }
      }),
    ]),
  });

  return {
    doc: () => view.state.doc.toString(),
    focus: () => {
      view.focus();
    },
    requestMeasure: () => {
      view.requestMeasure();
    },
    applyExternal: (source: string) => {
      applyExternal(view, source);
    },
    configureAccess: (
      attributes: Readonly<Record<string, string>>,
      isReadOnly: boolean
    ) => {
      view.dispatch({
        effects: access.reconfigure(accessExtension(attributes, isReadOnly)),
      });
    },
    destroy: () => {
      view.destroy();
    },
  };
};

/** The mounted editor. */
export type Engine = ReturnType<typeof createEngine>;
