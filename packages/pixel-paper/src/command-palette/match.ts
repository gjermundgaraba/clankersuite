import { Array, HashSet, Option, Order, String, pipe } from "effect";

import type { GlyphName } from "../glyph/glyphs.ts";

/** One row of the palette: a command, or a choice on a page. */
export type Choice = Readonly<{
  id: string;
  label: string;
  /** A key or a note at the right (`KeyHint.keyLabel` prints a binding). */
  hint?: string;
  /** An authored title (a page, an item): set in sans with a glyph. On the commands it waits
   *  for a query. */
  isAuthored?: boolean;
  glyph?: GlyphName;
  /** It cannot run now: still found, and the cursor still lands on it, but Enter and a click
   *  do nothing. Say why in `reason`. */
  isDisabled?: boolean;
  /** Why it cannot run now (`"No item open"`), printed in place of the hint while held. */
  reason?: string;
  /** On a page, its depth in the page's tree, from 1 at the roots: it sits under the nearest
   *  choice before it one level up, and indents by its depth. A page without levels is flat. */
  level?: number;
  /** More text a query finds it by, never shown (an item's description, who it is for). It
   *  is matched word by word, each word of the query somewhere in the label or here, not as
   *  the label's scattered letters, so a long text does not match every query. */
  keywords?: string;
}>;

/** A page of choices a command opens in place (a status, a date, a destination). */
export type Page = Readonly<{
  /** The page's name, in the head after Back (`"Status"`, `"Move to"`). */
  title: string;
  choices: readonly Choice[];
  /** The field's placeholder; `"type to narrow"` when not given. */
  find?: string;
  /** The choice in force now: tagged current, and not picked again. */
  current?: string;
  /** Where the cursor starts while the reader has not moved it: this choice while the query
   *  finds it, else `current` while the query finds it, else the first choice the query finds
   *  (the next status after the current one; the first a typed query finds). */
  start?: string;
}>;

/** One command, under its group's heading. With a `page` it opens that page in place instead
 *  of being selected. */
export type Command = Omit<Choice, "level"> &
  Readonly<{ group: string; page?: Page }>;

const isSubsequence = (needle: string, haystack: string): boolean =>
  Array.reduce(Array.fromIterable(haystack), 0, (found, character) =>
    needle.charAt(found) === character ? found + 1 : found
  ) === needle.length;

export const matches = (query: string, label: string): boolean => {
  const needle = pipe(query, String.trim, String.toLowerCase);

  return isSubsequence(needle, String.toLowerCase(label));
};

const hasEveryWord = (query: string, text: string): boolean => {
  const haystack = String.toLowerCase(text);

  return Array.every(
    String.split(pipe(query, String.trim, String.toLowerCase), /\s+/u),
    (word) => String.includes(word)(haystack)
  );
};

/** Whether a query finds a choice: its label's letters in order, or every word of the query
 *  in its label or keywords. */
export const finds = (query: string, choice: Choice): boolean =>
  matches(query, choice.label) ||
  (choice.keywords !== undefined &&
    hasEveryWord(query, `${choice.label} ${choice.keywords}`));

const isBlank = (query: string): boolean => String.isEmpty(String.trim(query));

export const findCommands = (
  commands: readonly Command[],
  query: string
): readonly Command[] => {
  const hits = isBlank(query)
    ? Array.filter(commands, (command) => command.isAuthored !== true)
    : Array.filter(commands, (command) => finds(query, command));

  const ordered = [
    ...Array.filter(hits, (command) => command.isAuthored !== true),
    ...Array.filter(hits, (command) => command.isAuthored === true),
  ];

  const groups = Array.dedupe(Array.map(ordered, ({ group }) => group));

  const groupIndex = (command: Command): number =>
    Option.getOrElse(
      Array.findFirstIndex(groups, (group) => group === command.group),
      () => groups.length
    );

  return Array.sort(ordered, Order.mapInput(Order.Number, groupIndex));
};

/** The choices a page's query finds. */
export const findChoices = (page: Page, query: string): readonly Choice[] =>
  isBlank(query)
    ? page.choices
    : Array.filter(page.choices, (choice) => finds(query, choice));

type Walk = Readonly<{
  chain: readonly Choice[];
  keptIds: HashSet.HashSet<string>;
}>;

const WALK_START: Walk = { chain: [], keptIds: HashSet.empty() };

export type PageChoices = Readonly<{
  rows: readonly Choice[];
  found: readonly Choice[];
  contextIds: HashSet.HashSet<string>;
}>;

const unfiltered = (page: Page): PageChoices => ({
  rows: page.choices,
  found: page.choices,
  contextIds: HashSet.empty(),
});

const treeChoices = (page: Page, query: string): PageChoices => {
  const found = findChoices(page, query);
  const foundIds = HashSet.fromIterable(Array.map(found, ({ id }) => id));

  const { keptIds } = Array.reduce(
    page.choices,
    WALK_START,
    ({ chain, keptIds: keptSoFar }, choice): Walk => {
      const nextChain = Array.append(
        Array.take(chain, (choice.level ?? 1) - 1),
        choice
      );

      return {
        chain: nextChain,
        keptIds: HashSet.has(foundIds, choice.id)
          ? HashSet.union(
              keptSoFar,
              HashSet.fromIterable(Array.map(nextChain, ({ id }) => id))
            )
          : keptSoFar,
      };
    }
  );

  return {
    rows: Array.filter(page.choices, ({ id }) => HashSet.has(keptIds, id)),
    found,
    contextIds: HashSet.difference(keptIds, foundIds),
  };
};

export const pageChoices = (page: Page, query: string): PageChoices =>
  isBlank(query) ? unfiltered(page) : treeChoices(page, query);
