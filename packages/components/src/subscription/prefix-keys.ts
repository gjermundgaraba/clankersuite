import { Array, String } from "effect";

type PrefixedKeys<Prefix extends string, Entries> = {
  readonly [
    Key in keyof Entries as `${Prefix}${Capitalize<Key & string>}`
  ]: Entries[Key];
};

/**
 * Re-keys a Subscriptions record behind `prefix`, so a component's record can be given once per
 * instance. Foldkit's `Subscription.aggregate` throws on a key two records share, and
 * `Subscription.lift` keeps a child's keys, so a component that may appear twice on a page
 * takes the prefix from its parent (`Board.subscriptions("queueBoard")`). The entries
 * themselves are unchanged.
 */
export const prefixKeys = <
  Prefix extends string,
  Entries extends Readonly<Record<string, unknown>>,
>(
  prefix: Prefix,
  entries: Entries
): PrefixedKeys<Prefix, Entries> =>
  Object.fromEntries(
    Array.map(Object.entries(entries), ([key, entry]) => [
      `${prefix}${String.capitalize(key)}`,
      entry,
    ])
  ) as PrefixedKeys<Prefix, Entries>;
