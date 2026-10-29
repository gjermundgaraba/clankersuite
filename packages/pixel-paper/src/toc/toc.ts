import { Array, Option, Schema, Stream, pipe } from "effect";
import type { Html, HtmlBuilder } from "foldkit/html";
import type { EntryWithoutKeepAlive } from "foldkit/subscription";

/** A heading's level: `2` at the margin, `3` indented under it. */
export const Level = Schema.Literals([2, 3]);

export type Level = typeof Level.Type;

/** One heading in the contents. */
export type Entry = Readonly<{
  /** The heading's id in the page. */
  id: string;
  /** The heading's words, the link's name. */
  label: string;
  level: Level;
}>;

/** Configuration for rendering a table of contents with `view`. */
export type ViewConfig = Readonly<{
  entries: readonly Entry[];
  /** The heading being read, from the caller's Model, kept by `readingPositionEntry`. `None`
   *  until it first reports, as during a server render: the first heading is marked. */
  maybeCurrentId: Option.Option<string>;
}>;

const currentId = (
  entries: readonly Entry[],
  maybeCurrentId: Option.Option<string>
): Option.Option<string> =>
  Option.orElse(maybeCurrentId, () =>
    Option.map(Array.head(entries), ({ id }) => id)
  );

/** The page's headings as plain links in a `<nav>` named "On this page". One ink cell marks the
 *  heading being read, which is also `aria-current`. */
export const view = <Message>(
  config: ViewConfig,
  h: HtmlBuilder<Message>
): Html => {
  const { entries } = config;
  const maybeCurrent = currentId(entries, config.maybeCurrentId);

  return h.nav(
    [h.AriaLabel("On this page")],
    [
      h.ul(
        [h.Class("toc")],
        Array.map(entries, ({ id, label, level }) =>
          h.keyed("li")(id, level === 3 ? [h.Class("l3")] : [], [
            h.a(
              [
                h.Href(`#${id}`),
                ...(Option.contains(maybeCurrent, id)
                  ? [h.AriaCurrent("true")]
                  : []),
              ],
              [label]
            ),
          ])
        )
      ),
    ]
  );
};

const READING_LINE = 0.2;

const readingPosition = (
  headingIds: readonly string[]
): Option.Option<string> => {
  const headings = Array.getSomes(
    Array.map(headingIds, (id) =>
      Option.fromNullishOr(document.querySelector(`#${CSS.escape(id)}`))
    )
  );

  const line = window.innerHeight * READING_LINE;

  return pipe(
    Array.findLast(
      headings,
      (heading) => heading.getBoundingClientRect().top <= line
    ),
    Option.orElse(() => Array.head(headings)),
    Option.map(({ id }) => id)
  );
};

/** Configuration for the `readingPositionEntry` Subscription helper. */
export type ReadingPositionConfig<Model, Message> = Readonly<{
  /** The ids of the headings the contents list, in page order; nothing is read while empty. */
  headingIds: (model: Model) => readonly string[];
  toMessage: (id: string) => Message;
}>;

/**
 * A Subscription entry that reports the heading being read: the last of `headingIds` that has
 * passed the upper fifth of the view, else the first. It reports once at the start and then
 * on each scroll that moves it to another heading. Keep the id in the Model and hand it to
 * `view` as `maybeCurrentId`. Pass it into `Subscription.make` as an entry value.
 *
 * A Subscription, not a Mount: what it reads is the window's scroll and headings elsewhere on
 * the page, not the contents element, and its answer is Model state the view renders.
 */
export const readingPositionEntry = <Model, Message>(
  config: ReadingPositionConfig<Model, Message>
): EntryWithoutKeepAlive<
  Model,
  Message,
  Readonly<{ headingIds: readonly string[] }>,
  never
> => ({
  dependenciesSchema: Schema.Struct({
    headingIds: Schema.Array(Schema.String),
  }),
  modelToDependencies: (model) => ({ headingIds: config.headingIds(model) }),
  dependenciesToStream: ({ headingIds }) =>
    Array.match(headingIds, {
      onEmpty: () => Stream.empty,
      onNonEmpty: (ids) =>
        Stream.suspend(() =>
          Stream.concat(
            Stream.make(undefined),
            Stream.fromEventListener(window, "scroll", { passive: true })
          )
        ).pipe(
          Stream.map(() => readingPosition(ids)),
          Stream.filter(Option.isSome),
          Stream.map(({ value }) => value),
          Stream.changes,
          Stream.map(config.toMessage)
        ),
    }),
});
