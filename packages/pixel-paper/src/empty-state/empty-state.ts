import { Array } from "effect";
import type { Html, HtmlBuilder } from "foldkit/html";

/** Configuration for rendering an empty state with `view`. */
export type ViewConfig = Readonly<{
  /** Pixel caps: what is missing (`"Nothing queued"`). */
  title: string;
  /** The title's element, which looks the same either way. A heading at this level where the
   *  empty state is the page's or a section's main content: `3` inside a Panel, whose title is
   *  an `h2`; `1` for a gate or a missing page. `"Strong"` where it is not (a chart with no
   *  data, a picture of the state). Required, because the two look alike and only the outline
   *  tells them apart. */
  headingLevel: 1 | 2 | 3 | 4 | 5 | 6 | "Strong";
  /** One sentence: how it gets filled. */
  body?: ReadonlyArray<Html | string>;
  /** What fills it: a button under the sentence. */
  actions?: ReadonlyArray<Html | string>;
}>;

/** What a panel says when it has nothing to show, centred where its content would be. */
export const view = <Message>(
  config: ViewConfig,
  h: HtmlBuilder<Message>
): Html => {
  const { title, headingLevel, body = [], actions = [] } = config;

  return h.div(
    [h.Class("empty")],
    [
      headingLevel === "Strong"
        ? h.strong([h.Class("empty-title")], [title])
        : h[`h${headingLevel}`]([h.Class("empty-title")], [title]),
      ...Array.match(body, {
        onEmpty: () => [],
        onNonEmpty: (sentence) => [h.p([], sentence)],
      }),
      ...actions,
    ]
  );
};
