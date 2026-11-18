import { Match, Option, Schema } from "effect";

/** The colour scheme: `Light` or `Dark` pinned on `<html data-color-scheme>`, as `"light"` or
 *  `"dark"`, or `System`, which follows the reader's system in CSS alone. */
export const Scheme = Schema.Literals(["System", "Light", "Dark"]);

export type Scheme = typeof Scheme.Type;

export const toPinnedValue = (scheme: Scheme): Option.Option<string> =>
  Match.value(scheme).pipe(
    Match.withReturnType<Option.Option<string>>(),
    Match.when("System", () => Option.none()),
    Match.when("Light", () => Option.some("light")),
    Match.when("Dark", () => Option.some("dark")),
    Match.exhaustive
  );

export const fromPinnedValue = (value: string | null): Scheme =>
  Match.value(value).pipe(
    Match.withReturnType<Scheme>(),
    Match.when("light", () => "Light"),
    Match.when("dark", () => "Dark"),
    Match.orElse(() => "System")
  );
