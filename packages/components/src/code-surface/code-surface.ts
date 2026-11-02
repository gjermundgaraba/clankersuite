import type { Html, HtmlBuilder } from "foldkit/html";

/** Configuration for rendering a code surface with `view`. */
export type ViewConfig = Readonly<{
  /** Names the block for screen readers: a file name, `"Response body"`. */
  label: string;
  /** The code: a string, or a highlighter's spans (`tok-*` classes take the content inks). */
  body: ReadonlyArray<Html | string>;
}>;

/** Code to read: a head-tinted block in the system monospace. It wraps rather than scrolls,
 *  and takes focus, so a keyboard reader can reach it and a screen reader names it: a `<pre>`
 *  may not be named, so it is a `role="group"`, which may. */
export const view = <Message>(
  config: ViewConfig,
  h: HtmlBuilder<Message>
): Html =>
  h.pre(
    [
      h.Tabindex(0),
      h.Role("group"),
      h.AriaLabel(config.label),
      h.Class("code-surface"),
    ],
    config.body
  );
