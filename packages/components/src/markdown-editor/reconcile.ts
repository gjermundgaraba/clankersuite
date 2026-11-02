/** Documents the editor sent up whose render has not come back yet, oldest first. */
export type Pending = readonly string[];

/** What a `source` write means for the editor. */
export type Reconciled = Readonly<{
  pending: Pending;
  /** The value came from somewhere other than this editor's typing. */
  isExternal: boolean;
}>;

/** CodeMirror's document keeps LF, so a stored CRLF text compares equal to it only after this. */
export const withLfLineEndings = (text: string): string =>
  text.replaceAll(/\r\n?/gu, "\n");

/** Remembers a document sent up, so its echo cannot be taken for an outside change. */
export const afterEmission = (pending: Pending, doc: string): Pending => [
  ...pending,
  doc,
];

/** Sorts a `source` write into an echo of this editor's own typing, which must not rewind a
 *  document that has moved on, or an outside change. A render may skip echoes, so a match
 *  also retires everything older. Text loss here would be silent, with no history behind it. */
export const afterSource = (
  pending: Pending,
  source: string,
  doc: string
): Reconciled => {
  const echoIndex = pending.indexOf(source);

  if (echoIndex !== -1) {
    return { pending: pending.slice(echoIndex + 1), isExternal: false };
  }

  return withLfLineEndings(source) === doc
    ? { pending, isExternal: false }
    : { pending: [], isExternal: true };
};
