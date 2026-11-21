import type { KeyboardModifiers } from "foldkit/html";

export const isPlain = (event: KeyboardModifiers): boolean =>
  !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey;

export const isUnhandledPlainKey = (event: KeyboardEvent): boolean =>
  !event.isComposing && !event.defaultPrevented && isPlain(event);
