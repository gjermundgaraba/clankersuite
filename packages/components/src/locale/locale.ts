import { Array, Predicate } from "effect";

/** The locale every number and date in the system is written in, so the server and every
 *  browser print the same. */
export const LOCALE = "en-GB";

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
