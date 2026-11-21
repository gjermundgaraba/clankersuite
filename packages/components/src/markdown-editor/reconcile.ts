import { Array, Option } from "effect";

export type Pending = readonly string[];

type Reconciled =
  | Readonly<{ _tag: "KeepDocument"; pending: Pending }>
  | Readonly<{ _tag: "ReplaceDocument"; pending: readonly []; source: string }>;

/** CodeMirror's document keeps LF, so a stored CRLF text compares equal to it only after this. */
export const withLfLineEndings = (text: string): string =>
  text.replaceAll(/\r\n?/gu, "\n");

export const afterEmission = (pending: Pending, doc: string): Pending => [
  ...pending,
  doc,
];

export const afterSource = (
  pending: Pending,
  source: string,
  doc: string
): Reconciled => {
  const echo = Array.findFirstIndex(pending, (sent) => sent === source);

  if (Option.isSome(echo)) {
    return {
      _tag: "KeepDocument",
      pending: Array.drop(pending, echo.value + 1),
    };
  }

  return withLfLineEndings(source) === doc
    ? { _tag: "KeepDocument", pending }
    : { _tag: "ReplaceDocument", pending: [], source };
};
