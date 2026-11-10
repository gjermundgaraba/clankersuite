import type { KeyboardModifiers } from "foldkit/html";

export const isPlain = (event: KeyboardModifiers): boolean =>
  !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey;

/** A plain key nothing has taken yet: not part of a composition, its default not prevented.
 *  The keys a component acts on in a Mount. */
export const isUnhandledPlainKey = (event: KeyboardEvent): boolean =>
  !event.isComposing && !event.defaultPrevented && isPlain(event);
