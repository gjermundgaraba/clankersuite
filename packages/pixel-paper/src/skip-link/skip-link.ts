import { Effect, Option, Schema } from "effect";
import * as Command from "foldkit/command";
import * as Dom from "foldkit/dom";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";

/** What `ScrollToFragment` reports. An application that runs it puts
 *  `CompletedScrollToFragment: {}` in its own Message union, which this tag matches. */
export const Message = defineMessageUnion({ CompletedScrollToFragment: {} });

export type Message = typeof Message.Type;

/**
 * The first thing in the page: a link to the main landmark (`#main`, as Deck, Stage and Wall render it), hidden until it holds the
 * keyboard. A Foldkit application routes every link click through its own update, so its
 * fragment handler must move focus to the target as the browser would: return
 * `ScrollToFragment` for a changed URL.
 */
export const view = <Message>(h: HtmlBuilder<Message>): Html =>
  h.a([h.Href("#main"), h.Class("skip")], ["Skip to content"]);

export const focusFragment = (fragment: string): Effect.Effect<void> =>
  Effect.suspend(() =>
    Dom.focus(`#${CSS.escape(fragment)}`, { makeFocusable: true })
  ).pipe(Effect.ignore);

/**
 * What a followed link does without an application in the way, for the application's URL
 * handler to return when the URL changes: with a fragment, scrolls to the element it names and
 * moves focus to it, making it focusable (`tabindex="-1"`) when it is not, so the next Tab
 * continues from there (nothing when no element has that id); without one, scrolls to the
 * top, since Foldkit reports a link followed and a step through history as the same change, so
 * a new page opens at its top either way. Reports `CompletedScrollToFragment`.
 */
export const ScrollToFragment = Command.define("ScrollToFragment", {
  args: { maybeFragment: Schema.Option(Schema.String) },
  messages: [Message.CompletedScrollToFragment],
  execute: ({ maybeFragment }) =>
    Option.match(maybeFragment, {
      onNone: () =>
        Effect.sync(() => {
          window.scrollTo(0, 0);
        }),
      onSome: (fragment) =>
        Dom.scrollIntoView(`#${CSS.escape(fragment)}`).pipe(
          Effect.ignore,
          Effect.andThen(focusFragment(fragment))
        ),
    }).pipe(Effect.as(Message.CompletedScrollToFragment())),
});
