import type { Html, HtmlBuilder } from "foldkit/html";

import type { Attributes } from "../attributes/attributes.ts";
import { lookClassName } from "../button/button.ts";
import type { Look } from "../button/button.ts";
import * as Glyph from "../glyph/glyph.ts";
import type { GlyphName } from "../glyph/glyphs.ts";

/** Configuration for rendering a link button with `view`. */
export type ViewConfig<Message> = Look &
  Readonly<{
    label: string;
    href: string;
    glyph?: GlyphName;
    /** Further attributes for the `<a>`, such as `Rel` and `Target` on an external link; never
     *  a class. */
    attributes?: Attributes<Message>;
  }>;

/** A `Button` that goes somewhere instead of doing something: a link printed the same. */
export const view = <Message>(
  config: ViewConfig<Message>,
  h: HtmlBuilder<Message>
): Html => {
  const { label, href, glyph, attributes = [] } = config;

  return h.a(
    [...attributes, h.Href(href), h.Class(lookClassName(config))],
    [...(glyph === undefined ? [] : [Glyph.view({ name: glyph }, h)]), label]
  );
};
