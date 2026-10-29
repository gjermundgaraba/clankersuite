import type { Html, HtmlBuilder } from "foldkit/html";

/** Configuration for rendering a secret with `view`. */
export type ViewConfig = Readonly<{
  value: string;
  /** What the value is ("API key"): the code's accessible name. A `<code>` may not be named,
   *  so it is a `role="group"`, which may. */
  label: string;
  /** After the code: a CopyButton labelled "Copy" and the label. */
  actions: ReadonlyArray<Html | string>;
}>;

/** A value shown once (a key, a token): code in a head-tinted box, named by its label, with
 *  the button that copies it. */
export const view = <Message>(
  config: ViewConfig,
  h: HtmlBuilder<Message>
): Html => {
  const { value, label, actions } = config;

  return h.div(
    [h.Class("secret")],
    [h.code([h.Role("group"), h.AriaLabel(label)], [value]), ...actions]
  );
};
