import type { Html, HtmlBuilder } from "foldkit/html";

/** Quiet words beside a title or a name, in the UI face at label size: an address, a count,
 *  "shown once". It prints a `span`; a meta line of its own goes in the caller's `p`. */
export const meta = <Message>(
  body: ReadonlyArray<Html | string>,
  h: HtmlBuilder<Message>
): Html => h.span([h.Class("gg-meta")], body);

/** A line of quiet prose under or between parts, in the body face, kept to a note's measure:
 *  "No matching tasks", a hint under a form. It prints a `p`. */
export const note = <Message>(
  body: ReadonlyArray<Html | string>,
  h: HtmlBuilder<Message>
): Html => h.p([h.Class("gg-note-line")], body);
