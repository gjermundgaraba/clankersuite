import type { Html, HtmlBuilder } from "foldkit/html";

import { lookClassName } from "../button/button.ts";
import type { Look } from "../button/button.ts";
import * as Glyph from "../glyph/glyph.ts";
import type { GlyphName } from "../glyph/glyphs.ts";

/** Configuration for rendering a link button with `view`. */
export type ViewConfig = Look &
  Readonly<{
    label: string;
    href: string;
    glyph?: GlyphName;
  }>;

/** A `Button` that goes somewhere instead of doing something: a link printed the same. */
export const view = <Message>(
  config: ViewConfig,
  h: HtmlBuilder<Message>
): Html => {
  const { label, href, glyph } = config;

  return h.a(
    [h.Href(href), h.Class(lookClassName(config))],
    [...(glyph === undefined ? [] : [Glyph.view({ name: glyph }, h)]), label]
  );
};
