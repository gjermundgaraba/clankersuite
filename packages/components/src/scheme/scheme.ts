import { Match, Option, Schema } from "effect";

/** The colour scheme: `Paper` (light) or `Plum` (dark) pinned on `<html data-color-scheme>`, as
 *  `"light"` or `"dark"`, or `System`, which follows the reader's system in CSS alone. */
export const Scheme = Schema.Literals(["System", "Paper", "Plum"]);

export type Scheme = typeof Scheme.Type;

export const toPinnedValue = (scheme: Scheme): Option.Option<string> =>
  Match.value(scheme).pipe(
    Match.withReturnType<Option.Option<string>>(),
    Match.when("System", () => Option.none()),
    Match.when("Paper", () => Option.some("light")),
    Match.when("Plum", () => Option.some("dark")),
    Match.exhaustive
  );

export const fromPinnedValue = (value: string | null): Scheme =>
  Match.value(value).pipe(
    Match.withReturnType<Scheme>(),
    Match.when("light", () => "Paper"),
    Match.when("dark", () => "Plum"),
    Match.orElse(() => "System")
  );
