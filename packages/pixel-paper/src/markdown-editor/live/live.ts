import { syntaxTree } from "@codemirror/language";
import {
  Prec,
  RangeSetBuilder,
  StateEffect,
  StateField,
} from "@codemirror/state";
import type {
  EditorState,
  Extension,
  StateEffectType,
  Transaction,
} from "@codemirror/state";
import {
  Decoration,
  EditorView,
  ViewPlugin,
  WidgetType,
  keymap,
} from "@codemirror/view";
import type { DecorationSet, ViewUpdate } from "@codemirror/view";
import type { SyntaxNode } from "@lezer/common";

import { safeHref, safeImageSource } from "../link-policy.ts";
import { liveMarkdownTheme } from "./theme.ts";

const UNKNOWN_HEIGHT = -1;
const TABLE_ROW_HEIGHT = 32;
const IMAGE_ESTIMATED_HEIGHT = 240;
const TABLE_HINT = "Click to edit the table";

type Drawing = Readonly<{
  key: string;
  draw: (view: EditorView) => HTMLElement;
  estimatedHeight: number;
  takesOwnEvents: boolean;
}>;

class DrawnWidget extends WidgetType {
  readonly drawing: Drawing;

  constructor(drawing: Drawing) {
    super();
    this.drawing = drawing;
  }

  override eq(other: DrawnWidget) {
    return other.drawing.key === this.drawing.key;
  }

  override toDOM(view: EditorView) {
    return this.drawing.draw(view);
  }

  override get estimatedHeight() {
    return this.drawing.estimatedHeight;
  }

  override ignoreEvent() {
    return this.drawing.takesOwnEvents;
  }
}

const spanOf = (className: string, text: string): HTMLElement => {
  const span = document.createElement("span");

  span.className = className;
  span.textContent = text;

  return span;
};

const checkboxWidget = (isChecked: boolean) =>
  new DrawnWidget({
    key: `checkbox:${isChecked}`,
    draw: () => {
      const box = document.createElement("input");

      box.type = "checkbox";
      box.checked = isChecked;
      box.className = "lmd-check";

      return box;
    },
    estimatedHeight: UNKNOWN_HEIGHT,
    takesOwnEvents: false,
  });

const bulletWidget = new DrawnWidget({
  key: "bullet",
  draw: () => spanOf("lmd-bullet", "•"),
  estimatedHeight: UNKNOWN_HEIGHT,
  takesOwnEvents: true,
});

const imageWidget = (source: string, alt: string) =>
  new DrawnWidget({
    key: `image:${source}\n${alt}`,
    draw: () => {
      const box = spanOf("lmd-img-box", "");
      const safeSource = safeImageSource(source, document.baseURI);

      if (safeSource === undefined) {
        box.append(
          spanOf("lmd-img-note", alt === "" ? "Image not shown" : alt)
        );

        return box;
      }

      const image = document.createElement("img");

      image.className = "lmd-img";
      image.alt = alt;
      image.addEventListener(
        "error",
        () => {
          image.replaceWith(
            spanOf(
              "lmd-img-note",
              alt === "" ? "Image not found" : `Image not found: ${alt}`
            )
          );
        },
        { once: true }
      );
      image.src = safeSource;
      box.append(image);

      return box;
    },
    estimatedHeight: IMAGE_ESTIMATED_HEIGHT,
    takesOwnEvents: false,
  });

const isList = (node: SyntaxNode | null) =>
  node?.name === "BulletList" || node?.name === "OrderedList";

const hide = Decoration.replace({});

const mark = (className: string) => Decoration.mark({ class: className });

const line = (className: string) => Decoration.line({ class: className });

const INLINE = new Map([
  ["Emphasis", "lmd-em"],
  ["StrongEmphasis", "lmd-strong"],
  ["Strikethrough", "lmd-strike"],
  ["InlineCode", "lmd-code"],
  ["Link", "lmd-link"],
]);

const HIDDEN_MARKS = new Set([
  "EmphasisMark",
  "StrikethroughMark",
  "LinkMark",
  "URL",
]);

const ATX_HEADING = /^ATXHeading(?<level>\d)$/u;

const isLinkLike = (node: SyntaxNode | null) =>
  node?.name === "Link" || node?.name === "Image";

const normalizedLabel = (label: string): string =>
  label.trim().replaceAll(/\s+/gu, " ").toLowerCase();

const linkDefinitions = (state: EditorState): ReadonlySet<string> => {
  const labels = new Set<string>();

  for (
    let node = syntaxTree(state).topNode.firstChild;
    node !== null;
    node = node.nextSibling
  ) {
    const label =
      node.name === "LinkReference" ? node.getChild("LinkLabel") : null;

    if (label !== null) {
      labels.add(normalizedLabel(state.sliceDoc(label.from + 1, label.to - 1)));
    }
  }

  return labels;
};

const bracketedText = (state: EditorState, node: SyntaxNode): string => {
  const label = node.getChild("LinkLabel");

  const text =
    label === null ? "" : state.sliceDoc(label.from + 1, label.to - 1);

  const [opening, closing] = node.getChildren("LinkMark");

  return normalizedLabel(text) === "" &&
    opening !== undefined &&
    closing !== undefined
    ? state.sliceDoc(opening.to, closing.from)
    : text;
};

const isPlainBrackets = (
  state: EditorState,
  node: SyntaxNode,
  definitions: ReadonlySet<string> = linkDefinitions(state)
): boolean =>
  isLinkLike(node) &&
  node.getChild("URL") === null &&
  !definitions.has(normalizedLabel(bracketedText(state, node)));

type Placed = Readonly<{
  from: number;
  to: number;
  decoration: Decoration;
  isReplace: boolean;
}>;

const build = (view: EditorView): DecorationSet => {
  const { state } = view;
  const { ranges } = state.selection;
  const isFocused = view.hasFocus;

  const touched = (from: number, to: number) =>
    isFocused && ranges.some((range) => range.from <= to && range.to >= from);

  const activeLine = (position: number) => {
    const { from, to } = state.doc.lineAt(position);

    return touched(from, to);
  };

  const placed: Placed[] = [];

  const add = (from: number, to: number, decoration: Decoration) => {
    placed.push({ from, to, decoration, isReplace: decoration === hide });
  };

  const replace = (from: number, to: number, widget: WidgetType) => {
    placed.push({
      from,
      to,
      decoration: Decoration.replace({ widget }),
      isReplace: true,
    });
  };

  const addLine = (position: number, decoration: Decoration) => {
    placed.push({
      from: position,
      to: position,
      decoration,
      isReplace: false,
    });
  };

  const addLines = (from: number, to: number, className: string) => {
    for (let position = from; position <= to;) {
      const { from: start, to: end } = state.doc.lineAt(position);

      addLine(start, line(className));
      position = end + 1;
    }
  };

  const hideWithFollowingSpace = (from: number, to: number) => {
    add(from, Math.min(to + 1, state.doc.lineAt(from).to), hide);
  };

  const definitions = linkDefinitions(state);

  for (const { from, to } of view.visibleRanges) {
    syntaxTree(state).iterate({
      from,
      to,
      enter: (node) => {
        const { name } = node;
        const { parent } = node.node;

        const level = ATX_HEADING.exec(name)?.groups?.["level"];

        if (level !== undefined) {
          addLine(
            state.doc.lineAt(node.from).from,
            line(`lmd-h lmd-h${level}`)
          );

          return true;
        }

        if (
          name === "HeaderMark" &&
          parent?.name.startsWith("ATXHeading") === true
        ) {
          if (!activeLine(node.from)) {
            hideWithFollowingSpace(node.from, node.to);
          }

          return true;
        }

        if (
          isLinkLike(node.node) &&
          isPlainBrackets(state, node.node, definitions)
        ) {
          return true;
        }

        if (
          name === "LinkMark" &&
          parent !== null &&
          isPlainBrackets(state, parent, definitions)
        ) {
          return true;
        }

        if (name === "Escape") {
          if (!touched(node.from, node.to)) {
            add(node.from, node.from + 1, hide);
          }

          return true;
        }

        if (name === "Image") {
          const url = node.node.getChild("URL");

          if (url !== null && !touched(node.from, node.to)) {
            const alt = state.sliceDoc(
              node.from + 2,
              Math.max(node.from + 2, url.from - 2)
            );

            replace(
              node.from,
              node.to,
              imageWidget(state.sliceDoc(url.from, url.to), alt)
            );
          }

          return true;
        }

        const inlineClass = INLINE.get(name);

        if (inlineClass !== undefined) {
          add(node.from, node.to, mark(inlineClass));

          return true;
        }

        if (name === "URL" && !isLinkLike(parent)) {
          add(node.from, node.to, mark("lmd-link"));

          return true;
        }

        if (
          parent !== null &&
          (HIDDEN_MARKS.has(name) ||
            (name === "CodeMark" && parent.name === "InlineCode"))
        ) {
          if (!touched(parent.from, parent.to)) {
            add(node.from, node.to, hide);
          }

          return true;
        }

        if (name === "FencedCode" || name === "CodeBlock") {
          addLines(node.from, node.to, "lmd-codeblock");

          return false;
        }

        if (name === "Blockquote") {
          addLines(node.from, node.to, "lmd-quote");

          return true;
        }

        if (name === "QuoteMark") {
          if (!activeLine(node.from)) {
            hideWithFollowingSpace(node.from, node.to);
          }

          return true;
        }

        if (name === "HorizontalRule") {
          if (!activeLine(node.from)) {
            addLine(state.doc.lineAt(node.from).from, line("lmd-hr"));
            add(node.from, node.to, hide);
          }

          return true;
        }

        if (name === "Table") {
          addLines(node.from, node.to, "lmd-table");

          return true;
        }

        if (name === "ListMark" && parent !== null && isList(parent.parent)) {
          if (activeLine(node.from)) {
            return true;
          }

          if (parent.getChild("Task") !== null) {
            hideWithFollowingSpace(node.from, node.to);
          } else if (parent.parent?.name === "BulletList") {
            replace(node.from, node.to, bulletWidget);
          }

          return true;
        }

        if (name === "TaskMarker" && !touched(node.from, node.to)) {
          const isChecked = /x/iu.test(state.sliceDoc(node.from, node.to));

          replace(node.from, node.to, checkboxWidget(isChecked));

          if (isChecked && parent !== null) {
            add(node.to, parent.to, mark("lmd-done"));
          }
        }

        return true;
      },
    });
  }

  placed.sort(
    (left, right) =>
      left.from - right.from ||
      left.decoration.startSide - right.decoration.startSide
  );

  const builder = new RangeSetBuilder<Decoration>();
  let lastReplaceEnd = -1;

  for (const { from, to, decoration, isReplace } of placed) {
    const isRangeReplace = from !== to && isReplace;

    if (!isRangeReplace || from >= lastReplaceEnd) {
      builder.add(from, to, decoration);

      if (isRangeReplace) {
        lastReplaceEnd = to;
      }
    }
  }

  return builder.finish();
};

const DELIMITER_ROW = /^\s*\|?[\s:|-]+\|?\s*$/u;

const tableCells = (row: string): readonly string[] =>
  row
    .trim()
    .replaceAll(/^\||\|$/gu, "")
    .split(/(?<!\\)\|/u)
    .map((cell) => cell.trim().replaceAll(String.raw`\|`, "|"));

const tableOf = (source: string): HTMLTableElement => {
  const table = document.createElement("table");
  const head = table.createTHead();
  const body = table.createTBody();
  const rows = source.split("\n").filter((row) => row.trim() !== "");

  table.className = "lmd-table-view";

  for (const [index, row] of rows.entries()) {
    if (index !== 1 || !DELIMITER_ROW.test(row)) {
      const tableRow = document.createElement("tr");

      for (const text of tableCells(row)) {
        const cell = document.createElement(index === 0 ? "th" : "td");

        cell.textContent = text;
        tableRow.append(cell);
      }

      (index === 0 ? head : body).append(tableRow);
    }
  }

  return table;
};

const tableWidget = (text: string) =>
  new DrawnWidget({
    key: `table:${text}`,
    draw: (view) => {
      const dom = document.createElement("div");

      dom.className = "lmd-table-widget";
      dom.title = TABLE_HINT;
      dom.append(tableOf(text));
      dom.addEventListener("mousedown", (event) => {
        event.preventDefault();

        const row =
          event.target instanceof Element ? event.target.closest("tr") : null;

        const rows = [...dom.querySelectorAll("tr")];
        const rowIndex = row === null ? -1 : rows.indexOf(row);
        const sourceOffset = rowIndex <= 0 ? 0 : rowIndex + 1;
        const first = view.state.doc.lineAt(view.posAtDOM(dom));

        const target = view.state.doc.line(
          Math.min(first.number + sourceOffset, view.state.doc.lines)
        );

        view.dispatch({
          selection: { anchor: Math.min(target.from + 2, target.to) },
        });
        view.focus();
      });

      return dom;
    },
    estimatedHeight: TABLE_ROW_HEIGHT * text.split("\n").length,
    takesOwnEvents: true,
  });

const lastValueOf = <Value>(
  transaction: Transaction,
  type: StateEffectType<Value>,
  held: Value
): Value => {
  const last = transaction.effects.findLast(
    (effect): effect is StateEffect<Value> => effect.is(type)
  );

  return last === undefined ? held : last.value;
};

const setFocus = StateEffect.define<boolean>();
const setPointerDown = StateEffect.define<boolean>();

const pointerDownField = StateField.define<boolean>({
  create: () => false,
  update: (isDown, transaction) =>
    lastValueOf(transaction, setPointerDown, isDown),
});

const POINTER_RELEASE_EVENTS = ["mouseup", "dragend", "contextmenu"] as const;

const holdRevealUntilPointerRelease = (view: EditorView): void => {
  const { ownerDocument } = view.dom;

  const release = () => {
    for (const name of POINTER_RELEASE_EVENTS) {
      ownerDocument.removeEventListener(name, release);
    }

    setTimeout(() => {
      view.dispatch({ effects: setPointerDown.of(false) });
    }, 0);
  };

  view.dispatch({ effects: setPointerDown.of(true) });

  for (const name of POINTER_RELEASE_EVENTS) {
    ownerDocument.addEventListener(name, release);
  }
};

const buildTables = (state: EditorState, isFocused: boolean): DecorationSet => {
  const builder = new RangeSetBuilder<Decoration>();

  syntaxTree(state).iterate({
    enter: (node) => {
      if (node.name !== "Table") {
        return (
          node.name === "Document" ||
          node.name.endsWith("List") ||
          node.name === "ListItem" ||
          node.name === "Blockquote"
        );
      }

      const { from } = state.doc.lineAt(node.from);
      const { to } = state.doc.lineAt(node.to);

      const isInside = state.selection.ranges.some(
        (range) => range.from <= to && range.to >= from
      );

      if (from === node.from && !(isFocused && isInside)) {
        builder.add(
          from,
          to,
          Decoration.replace({
            widget: tableWidget(state.sliceDoc(from, to)),
            block: true,
          })
        );
      }

      return false;
    },
  });

  return builder.finish();
};

type TablesState = Readonly<{
  isFocused: boolean;
  decorations: DecorationSet;
}>;

const tablesField = StateField.define<TablesState>({
  create: (state) => ({
    isFocused: false,
    decorations: buildTables(state, false),
  }),
  update: (value, transaction) => {
    const isFocused = lastValueOf(transaction, setFocus, value.isFocused);
    const wasDown = transaction.startState.field(pointerDownField);
    const isDown = transaction.state.field(pointerDownField);

    if (isDown && !transaction.docChanged) {
      return { isFocused, decorations: value.decorations };
    }

    return isFocused === value.isFocused &&
      wasDown === isDown &&
      !transaction.docChanged &&
      transaction.selection === undefined &&
      syntaxTree(transaction.startState) === syntaxTree(transaction.state)
      ? value
      : { isFocused, decorations: buildTables(transaction.state, isFocused) };
  },
  provide: (field) =>
    EditorView.decorations.from(field, (value) => value.decorations),
});

const linkHref = (state: EditorState, node: SyntaxNode): string | undefined => {
  const url = node.name === "Link" ? node.getChild("URL") : node;

  if (url === null) {
    return undefined;
  }

  const href = state.sliceDoc(url.from, url.to);

  return /^www\./iu.test(href) ? `https://${href}` : href;
};

const isLinkNode = (state: EditorState, node: SyntaxNode): boolean =>
  !isPlainBrackets(state, node) &&
  (node.name === "Link" || (node.name === "URL" && !isLinkLike(node.parent)));

const toggleCheckbox = (view: EditorView, box: HTMLInputElement): boolean => {
  const position = view.posAtDOM(box);
  const text = view.state.sliceDoc(position, position + 3);

  if (!/^\[[ xX]\]$/u.test(text)) {
    return false;
  }

  view.dispatch({
    changes: {
      from: position + 1,
      to: position + 2,
      insert: text.charAt(1) === " " ? "x" : " ",
    },
  });

  return true;
};

const linkAt = (
  state: EditorState,
  position: number,
  side: -1 | 1
): string | undefined => {
  for (
    let node: SyntaxNode | null = syntaxTree(state).resolveInner(
      position,
      side
    );
    node !== null;
    node = node.parent
  ) {
    if (isLinkNode(state, node)) {
      return linkHref(state, node);
    }
  }

  return undefined;
};

const openLink = (url: string): void => {
  const href = safeHref(url, document.baseURI);

  if (href !== undefined) {
    window.open(href, "_blank", "noopener,noreferrer");
  }
};

const openLinkAtCaret = (view: EditorView): boolean => {
  const { head } = view.state.selection.main;
  const url = linkAt(view.state, head, 1) ?? linkAt(view.state, head, -1);

  if (url === undefined) {
    return false;
  }

  openLink(url);

  return true;
};

/** Markdown drawn over its own text, as in Obsidian's Live Preview: the document stays
 *  Markdown, and its marks show only around the selection. Redrawing a reveal moves text, so
 *  nothing redraws under an IME's composition or a pressed mouse button. */
export const liveMarkdown = (): Extension => {
  const preview = ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      isStale = false;

      constructor(view: EditorView) {
        this.decorations = build(view);
      }

      update(update: ViewUpdate) {
        if (
          update.view.composing ||
          (update.state.field(pointerDownField) && !update.docChanged)
        ) {
          this.decorations = this.decorations.map(update.changes);
          this.isStale = true;
        } else if (
          this.isStale ||
          update.docChanged ||
          update.selectionSet ||
          update.focusChanged ||
          update.viewportChanged ||
          syntaxTree(update.startState) !== syntaxTree(update.state)
        ) {
          this.decorations = build(update.view);
          this.isStale = false;
        }
      }
    },
    {
      decorations: (plugin) => plugin.decorations,
      eventObservers: {
        compositionend: (_, view) => {
          setTimeout(() => {
            view.dispatch({});
          }, 0);
        },
      },
      eventHandlers: {
        mousedown: (event, view) => {
          if (
            event.target instanceof HTMLInputElement &&
            event.target.classList.contains("lmd-check") &&
            toggleCheckbox(view, event.target)
          ) {
            event.preventDefault();

            return true;
          }

          if (event.metaKey || event.ctrlKey) {
            const position = view.posAtCoords({
              x: event.clientX,
              y: event.clientY,
            });

            const url =
              position === null ? undefined : linkAt(view.state, position, 1);

            if (url !== undefined) {
              openLink(url);
              event.preventDefault();

              return true;
            }
          }

          if (event.button === 0) {
            holdRevealUntilPointerRelease(view);
          }

          return false;
        },
      },
    }
  );

  return [
    pointerDownField,
    preview,
    tablesField,
    Prec.high(keymap.of([{ key: "Mod-Enter", run: openLinkAtCaret }])),
    EditorView.focusChangeEffect.of((_, isFocusing) => setFocus.of(isFocusing)),
    liveMarkdownTheme,
  ];
};
