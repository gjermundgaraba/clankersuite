import { Record } from "effect";

export const prefixedEntry = <
  Prefix extends string,
  Name extends string,
  Entry,
>(
  prefix: Prefix,
  name: Name,
  entry: Entry
): Record.ReadonlyRecord<`${Prefix}${Name}`, Entry> =>
  Record.singleton(`${prefix}${name}`, entry);
