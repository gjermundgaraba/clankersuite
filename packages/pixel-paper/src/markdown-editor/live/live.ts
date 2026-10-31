import { syntaxTree } from '@codemirror/language';
import { RangeSetBuilder, StateEffect, StateField, type EditorState, type Extension } from '@codemirror/state';
import { Decoration, EditorView, ViewPlugin, WidgetType, type DecorationSet, type ViewUpdate } from '@codemirror/view';
import type { SyntaxNode } from '@lezer/common';
import { liveMarkdownTheme } from './theme.ts';

/**
 * «Живой» Markdown, как Live Preview в Obsidian: текст остаётся Markdown, оформление рисуется поверх,
 * служебные символы видны только там, где стоит курсор. Без фокуса весь текст показан оформлённым.
 */

// ------------------------------------------------------------------ настройки

export interface LiveMarkdownOptions {
  /** Ctrl/Cmd+клик по ссылке. По умолчанию — новая вкладка */
  openLink?: (url: string) => void;
}

// ------------------------------------------------------------------ виджеты

/** Оформление не меняет исходник: при наведении курсора снова видна разметка. */
class TypographyWidget extends WidgetType {
  readonly text: string;
  readonly divider: boolean;
  constructor(text: string, divider = false) {
    super();
    this.text = text;
    this.divider = divider;
  }
  eq(other: TypographyWidget) {
    return this.text === other.text && this.divider === other.divider;
  }
  toDOM() {
    const dom = document.createElement('span');
    dom.textContent = this.text;
    if (this.divider) dom.className = 'lmd-labeled-rule';
    return dom;
  }
  ignoreEvent() {
    return false;
  }
}

class CheckboxWidget extends WidgetType {
  readonly checked: boolean;
  constructor(checked: boolean) {
    super();
    this.checked = checked;
  }
  eq(other: CheckboxWidget) {
    return other.checked === this.checked;
  }
  toDOM() {
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = this.checked;
    box.className = 'lmd-check';
    return box;
  }
  ignoreEvent() {
    return false;
  }
}

/** Маркер пункта вне курсора: «• •» по уровню вложенности или номер «3.1.» */
class ListMarkWidget extends WidgetType {
  readonly text: string;
  constructor(text: string) {
    super();
    this.text = text;
  }
  eq(other: ListMarkWidget) {
    return other.text === this.text;
  }
  toDOM() {
    const mark = document.createElement('span');
    mark.className = 'lmd-bullet';
    mark.textContent = this.text;
    return mark;
  }
}

class ImageWidget extends WidgetType {
  readonly src: string;
  readonly alt: string;
  constructor(src: string, alt: string) {
    super();
    this.src = src;
    this.alt = alt;
  }
  eq(other: ImageWidget) {
    return other.src === this.src && other.alt === this.alt;
  }
  toDOM() {
    const note = (text: string) => {
      const span = document.createElement('span');
      span.className = 'lmd-img-note';
      span.textContent = text;
      return span;
    };
    // Корень виджета не подменяем: CodeMirror принял бы новый узел за набранный текст и вписал подпись в документ
    const box = document.createElement('span');
    box.className = 'lmd-img-box';
    const img = document.createElement('img');
    img.className = 'lmd-img';
    img.alt = this.alt;
    img.addEventListener(
      'error',
      () => img.replaceWith(note(this.alt ? `Image not found: ${this.alt}` : 'Image not found')),
      { once: true },
    );
    img.src = this.src;
    box.append(img);
    return box;
  }
  get estimatedHeight() {
    return 240;
  }
  ignoreEvent() {
    return false;
  }
}

// ------------------------------------------------------------------ списки

const isList = (n: SyntaxNode | null) => n?.name === 'BulletList' || n?.name === 'OrderedList';

/** Уровень пункта: сколько списков над ним (1 — верхний) */
function listDepth(item: SyntaxNode) {
  let depth = 0;
  for (let n: SyntaxNode | null = item.parent; n; n = n.parent) if (isList(n)) depth++;
  return depth;
}

/** Номер пункта: номер первого пункта списка + место среди соседей */
function itemNumber(state: EditorState, item: SyntaxNode) {
  const mark = item.parent?.firstChild?.getChild('ListMark');
  const start = mark ? parseInt(state.sliceDoc(mark.from, mark.to), 10) || 1 : 1;
  let index = 0;
  for (let n = item.prevSibling; n; n = n.prevSibling) if (n.name === 'ListItem') index++;
  return start + index;
}

/** Разделитель нумерованного списка, как набран в исходнике: «.» или «)» (иначе «.») */
function listDelim(state: EditorState, item: SyntaxNode) {
  const mark = item.parent?.firstChild?.getChild('ListMark');
  const m = mark ? /[.)]$/.exec(state.sliceDoc(mark.from, mark.to)) : null;
  return m ? m[0] : '.';
}

/** «3.1.2.» / «3.1.2)» — номера всех нумерованных пунктов-предков; разделитель — как в исходнике */
function outlineNumber(state: EditorState, item: SyntaxNode) {
  const parts: number[] = [];
  for (let n: SyntaxNode | null = item; n; n = n.parent)
    if (n.name === 'ListItem' && n.parent?.name === 'OrderedList') parts.unshift(itemNumber(state, n));
  return `${parts.join('.')}${listDelim(state, item)}`;
}

/** Текст маркера пункта вне курсора: «• •» по уровню вложенности или номер «3.1.» / «3.1)» */
function listMarker(state: EditorState, item: SyntaxNode) {
  const list = item.parent;
  if (list?.name === 'BulletList') return Array(listDepth(item)).fill('•').join(' ');
  return list?.name === 'OrderedList' ? outlineNumber(state, item) : '';
}

// ------------------------------------------------------------------ оформление по дереву

const hide = Decoration.replace({});
const mark = (cls: string) => Decoration.mark({ class: cls });
const line = (cls: string) => Decoration.line({ class: cls });

const INLINE: Record<string, string> = {
  Emphasis: 'lmd-em',
  StrongEmphasis: 'lmd-strong',
  Strikethrough: 'lmd-strike',
  InlineCode: 'lmd-code',
  Link: 'lmd-link',
};
const HIDDEN_MARKS = new Set(['EmphasisMark', 'StrikethroughMark', 'LinkMark', 'URL']);
/** Адрес внутри [текст](адрес) или ![](адрес) — служебная часть, прячется вне курсора */
const isLinkLike = (node: SyntaxNode | null) => node?.name === 'Link' || node?.name === 'Image';

const normLabel = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase();

/** Подписи сносок `[подпись]: адрес` документа — они стоят только на верхнем уровне */
function linkDefinitions(state: EditorState) {
  const labels = new Set<string>();
  for (let n = syntaxTree(state).topNode.firstChild; n; n = n.nextSibling) {
    if (n.name !== 'LinkReference') continue;
    const label = n.getChild('LinkLabel');
    if (label) labels.add(normLabel(state.sliceDoc(label.from + 1, label.to - 1)));
  }
  return labels;
}

/**
 * Ссылка без адреса — `[текст]`, `[текст][]`, `[текст][метка]` или `![подпись]` — и без сноски с такой меткой.
 * Парсер считает её ссылкой, а при показе это обычный текст в скобках: скобки не прячем.
 */
function isPlainBrackets(state: EditorState, node: SyntaxNode, definitions = linkDefinitions(state)) {
  if (!isLinkLike(node) || node.getChild('URL')) return false;
  const marks = node.getChildren('LinkMark');
  const label = node.getChild('LinkLabel');
  let text = label ? state.sliceDoc(label.from + 1, label.to - 1) : '';
  if (!normLabel(text) && marks.length >= 2) text = state.sliceDoc(marks[0].to, marks[1].from);
  return !definitions.has(normLabel(text));
}

function build(view: EditorView): DecorationSet {
  const { state } = view;
  const sel = state.selection.ranges;
  // Без фокуса показываем всё оформлённым, как в просмотре
  const focused = view.hasFocus;
  /** Участок [from, to] задевает курсор/выделение — показываем исходник */
  const touched = (from: number, to: number) => focused && sel.some((r) => r.from <= to && r.to >= from);
  const activeLine = (pos: number) => {
    const l = state.doc.lineAt(pos);
    return touched(l.from, l.to);
  };

  // Декорации собираем списком и сортируем: дерево и регулярки идут вперемешку
  const out: { from: number; to: number; deco: Decoration }[] = [];
  const add = (from: number, to: number, deco: Decoration) => out.push({ from, to, deco });
  const addLine = (pos: number, deco: Decoration) => out.push({ from: pos, to: pos, deco });
  const labeledRanges: [number, number][] = [];
  const definitions = linkDefinitions(state);

  for (const { from, to } of view.visibleRanges) {
    const text = state.sliceDoc(from, to);

    syntaxTree(state).iterate({
      from,
      to,
      enter: (node) => {
        if (labeledRanges.some(([a, b]) => node.from >= a && node.to <= b)) return false;
        const name = node.name;
        const parent = node.node.parent;

        // Разделитель с подписью занимает отдельную строку обычного абзаца.
        if (name === 'Paragraph' && parent?.name === 'Document') {
          const paragraph = state.sliceDoc(node.from, node.to);
          for (const label of paragraph.matchAll(/^ {0,3}---[ \t]+(\S(?:[^\n]*?\S)?)[ \t]+---[ \t]*$/gm)) {
            const start = node.from + label.index;
            const end = start + label[0].length;
            if (!activeLine(start)) {
              labeledRanges.push([start, end]);
              add(start, end, Decoration.replace({ widget: new TypographyWidget(label[1], true) }));
            }
          }
        }

        const heading = /^ATXHeading(\d)$/.exec(name);
        if (heading) {
          addLine(state.doc.lineAt(node.from).from, line(`lmd-h lmd-h${heading[1]}`));
          return;
        }
        if (name === 'HeaderMark' && parent?.name.startsWith('ATXHeading')) {
          if (!activeLine(node.from)) {
            // Вместе с пробелом после #
            const end = Math.min(node.to + 1, state.doc.lineAt(node.from).to);
            add(node.from, end, hide);
          }
          return;
        }
        // [текст] без адреса — обычный текст: скобки видны, внутри работает остальное оформление
        if (isLinkLike(node.node) && isPlainBrackets(state, node.node, definitions)) return;
        if (name === 'LinkMark' && parent && isPlainBrackets(state, parent, definitions)) return;
        // \[ и подобные — обратная черта прячется вне курсора, остаётся сам знак
        if (name === 'Escape') {
          if (!touched(node.from, node.to)) add(node.from, node.from + 1, hide);
          return;
        }
        if (name === 'Image') {
          const url = node.node.getChild('URL');
          if (url && !touched(node.from, node.to)) {
            const alt = state.sliceDoc(node.from + 2, Math.max(node.from + 2, url.from - 2));
            add(node.from, node.to, Decoration.replace({ widget: new ImageWidget(state.sliceDoc(url.from, url.to), alt) }));
          }
          return;
        }
        if (INLINE[name]) {
          add(node.from, node.to, mark(INLINE[name]));
          return;
        }
        // Голая ссылка (https://…, www.…) и <https://…> — сам адрес и есть текст: не прячем, оформляем ссылкой
        if (name === 'URL' && !isLinkLike(parent)) {
          add(node.from, node.to, mark('lmd-link'));
          return;
        }
        if ((HIDDEN_MARKS.has(name) || (name === 'CodeMark' && parent?.name === 'InlineCode')) && parent) {
          if (!touched(parent.from, parent.to)) add(node.from, node.to, hide);
          return;
        }
        if (name === 'FencedCode' || name === 'CodeBlock') {
          for (let pos = node.from; pos <= node.to;) {
            const l = state.doc.lineAt(pos);
            addLine(l.from, line('lmd-codeblock'));
            pos = l.to + 1;
          }
          return false;
        }
        if (name === 'Blockquote') {
          for (let pos = node.from; pos <= node.to;) {
            const l = state.doc.lineAt(pos);
            addLine(l.from, line('lmd-quote'));
            pos = l.to + 1;
          }
          return;
        }
        if (name === 'QuoteMark') {
          if (!activeLine(node.from)) add(node.from, Math.min(node.to + 1, state.doc.lineAt(node.from).to), hide);
          return;
        }
        if (name === 'HorizontalRule') {
          if (!activeLine(node.from)) {
            addLine(state.doc.lineAt(node.from).from, line('lmd-hr'));
            add(node.from, node.to, hide);
          }
          return;
        }
        if (name === 'Table') {
          for (let pos = node.from; pos <= node.to;) {
            const l = state.doc.lineAt(pos);
            addLine(l.from, line('lmd-table'));
            pos = l.to + 1;
          }
          return;
        }
        if (name === 'ListMark' && parent && isList(parent.parent)) {
          if (activeLine(node.from)) return;
          // Пункт с чекбоксом: маркер списка прячем совсем, остаётся флажок
          if (parent.getChild('Task')) {
            add(node.from, Math.min(node.to + 1, state.doc.lineAt(node.from).to), hide);
            return;
          }
          add(node.from, node.to, Decoration.replace({ widget: new ListMarkWidget(listMarker(state, parent)) }));
          return;
        }
        if (name === 'TaskMarker') {
          if (!touched(node.from, node.to)) {
            const checked = /x/i.test(state.sliceDoc(node.from, node.to));
            add(node.from, node.to, Decoration.replace({ widget: new CheckboxWidget(checked) }));
            if (checked && parent) add(node.to, parent.to, mark('lmd-done'));
          }
          return;
        }
      },
    });

    // Только отдельное двойное тире в обычном тексте: URL и код сохраняем.
    for (const match of text.matchAll(/(?<![\S\\])--(?!\S)/g)) {
      const start = from + match.index;
      const end = start + 2;
      if (touched(start, end)) continue;
      let node: SyntaxNode | null = syntaxTree(state).resolveInner(start, 1);
      let plain = true;
      while (node) {
        if (/Code|Link|URL|Image|HTML|HorizontalRule|Table|Escape/.test(node.name)) {
          plain = false;
          break;
        }
        node = node.parent;
      }
      if (plain) add(start, end, Decoration.replace({ widget: new TypographyWidget('—') }));
    }
  }

  out.sort((a, b) => a.from - b.from || a.deco.startSide - b.deco.startSide);
  const builder = new RangeSetBuilder<Decoration>();
  let lastHideEnd = -1;
  for (const d of out) {
    // Пересекающиеся замены RangeSetBuilder не любит — внутренние пропускаем
    const isReplace = d.from !== d.to && (d.deco.spec.widget || d.deco === hide);
    if (isReplace && d.from < lastHideEnd) continue;
    builder.add(d.from, d.to, d.deco);
    if (isReplace) lastHideEnd = d.to;
  }
  return builder.finish();
}

// ------------------------------------------------------------------ таблицы — отрисованная таблица вне курсора

const TABLE_HINT = 'Click to edit the table';

/** Встроенная таблица: текст ячеек как есть, без разметки внутри */
function renderPlainTable(source: string, dom: HTMLElement) {
  const cells = (row: string) =>
    row
      .trim()
      .replace(/^\||\|$/g, '')
      .split(/(?<!\\)\|/)
      .map((c) => c.trim().replace(/\\\|/g, '|'));
  const rows = source.split('\n').filter((r) => r.trim());
  const table = document.createElement('table');
  table.className = 'lmd-table-view';
  rows.forEach((row, i) => {
    if (i === 1 && /^\s*\|?[\s:|-]+\|?\s*$/.test(row)) return;
    const tr = document.createElement('tr');
    for (const text of cells(row)) {
      const cell = document.createElement(i === 0 ? 'th' : 'td');
      cell.textContent = text;
      tr.append(cell);
    }
    (i === 0 ? (table.createTHead() as HTMLElement) : (table.tBodies[0] ?? table.createTBody())).append(tr);
  });
  dom.append(table);
}

class TableWidget extends WidgetType {
  readonly text: string;
  constructor(text: string) {
    super();
    this.text = text;
  }
  eq(other: TableWidget) {
    return other.text === this.text;
  }
  toDOM(view: EditorView) {
    const dom = document.createElement('div');
    dom.className = 'lmd-table-widget';
    dom.title = TABLE_HINT;
    renderPlainTable(this.text, dom);
    // Клик — курсор в ту же строку исходника: таблица раскрывается в текст с |
    dom.addEventListener('mousedown', (e) => {
      if ((e.target as HTMLElement).closest('a')) return;
      e.preventDefault();
      const rows = [...dom.querySelectorAll('tr')];
      const row = rows.indexOf((e.target as HTMLElement).closest('tr')!);
      // Строка-разделитель | --- | есть в исходнике, но не в таблице
      const lineOffset = row <= 0 ? 0 : row + 1;
      const first = view.state.doc.lineAt(view.posAtDOM(dom));
      const target = view.state.doc.line(Math.min(first.number + lineOffset, view.state.doc.lines));
      view.dispatch({ selection: { anchor: Math.min(target.from + 2, target.to) } });
      view.focus();
    });
    return dom;
  }
  get estimatedHeight() {
    return 32 * this.text.split('\n').length;
  }
  ignoreEvent() {
    return true;
  }
}

/** Фокус редактора — в состоянии, чтобы без фокуса таблицы были отрисованы, даже если курсор в них */
const setFocus = StateEffect.define<boolean>();

function buildTables(state: EditorState, focused: boolean): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  syntaxTree(state).iterate({
    enter: (node) => {
      if (node.name !== 'Table')
        return (
          node.name === 'Document' ||
          node.name.endsWith('List') ||
          node.name === 'ListItem' ||
          node.name === 'Blockquote'
        );
      const from = state.doc.lineAt(node.from).from;
      const to = state.doc.lineAt(node.to).to;
      const inside = state.selection.ranges.some((r) => r.from <= to && r.to >= from);
      // Таблица внутри списка/цитаты — оставляем текстом: префиксы строк не часть таблицы
      if (from !== node.from) return false;
      if (!(focused && inside))
        builder.add(from, to, Decoration.replace({ widget: new TableWidget(state.sliceDoc(from, to)), block: true }));
      return false;
    },
  });
  return builder.finish();
}

function tablesField() {
  return StateField.define<{ focused: boolean; decos: DecorationSet }>({
    create: (state) => ({ focused: false, decos: buildTables(state, false) }),
    update(value, tr) {
      let focused = value.focused;
      for (const e of tr.effects) if (e.is(setFocus)) focused = e.value;
      if (
        focused === value.focused &&
        !tr.docChanged &&
        !tr.selection &&
        syntaxTree(tr.startState) === syntaxTree(tr.state)
      )
        return value;
      return { focused, decos: buildTables(tr.state, focused) };
    },
    provide: (f) => EditorView.decorations.from(f, (v) => v.decos),
  });
}

// ------------------------------------------------------------------ сборка

/** Живой Markdown для CodeMirror 6 — одно расширение со всеми частями */
export function liveMarkdown(options: LiveMarkdownOptions = {}): Extension {
  const openLink = options.openLink ?? ((url: string) => window.open(url, '_blank', 'noreferrer'));

  const preview = ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;
      constructor(view: EditorView) {
        this.decorations = build(view);
      }
      update(u: ViewUpdate) {
        if (
          u.docChanged ||
          u.selectionSet ||
          u.focusChanged ||
          u.viewportChanged ||
          syntaxTree(u.startState) !== syntaxTree(u.state)
        )
          this.decorations = build(u.view);
      }
    },
    {
      decorations: (v) => v.decorations,
      eventHandlers: {
        mousedown(e, view) {
          const target = e.target as HTMLElement;
          if (target instanceof HTMLInputElement && target.classList.contains('lmd-check')) {
            const pos = view.posAtDOM(target);
            const text = view.state.sliceDoc(pos, pos + 3);
            if (/^\[[ xX]\]$/.test(text)) {
              view.dispatch({ changes: { from: pos + 1, to: pos + 2, insert: text[1] === ' ' ? 'x' : ' ' } });
              e.preventDefault();
              return true;
            }
          }
          // Ctrl/Cmd+клик по ссылке — открыть
          if (e.metaKey || e.ctrlKey) {
            const pos = view.posAtCoords({ x: e.clientX, y: e.clientY });
            if (pos === null) return false;
            for (let n: SyntaxNode | null = syntaxTree(view.state).resolveInner(pos, 1); n; n = n.parent) {
              let url: SyntaxNode | null;
              if (isPlainBrackets(view.state, n)) continue;
              if (n.name === 'Link') url = n.getChild('URL');
              else if (n.name === 'URL' && !isLinkLike(n.parent)) url = n;
              else continue;
              if (url) {
                const href = view.state.sliceDoc(url.from, url.to);
                openLink(/^www\./i.test(href) ? `https://${href}` : href);
              }
              e.preventDefault();
              return true;
            }
          }
          return false;
        },
      },
    },
  );

  return [
    preview,
    tablesField(),
    EditorView.focusChangeEffect.of((_, focusing) => setFocus.of(focusing)),
    liveMarkdownTheme,
  ];
}
