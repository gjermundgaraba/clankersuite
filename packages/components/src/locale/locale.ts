import { Array, Predicate } from "effect";

/** The locale every number and date in the system is written in, so the server and every
 *  browser print the same. */
export const LOCALE = "en-GB";

/** Writes each field into its `{name}` in a template, numbers in `LOCALE`:
 *  `fill("{item}, {position} of {total}.", { item: "Notes", position: 2, total: 5 })`. */
export const fill = (
  template: string,
  fields: Readonly<Record<string, string | number>>
): string =>
  Array.reduce(Object.entries(fields), template, (text, [key, value]) =>
    text.replaceAll(
      `{${key}}`,
      Predicate.isNumber(value) ? value.toLocaleString(LOCALE) : value
    )
  );
