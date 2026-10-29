import { Array, Duration, Effect, Option, Schema, pipe } from "effect";
import * as Command from "foldkit/command";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import * as Render from "foldkit/render";

/** What `Announce` and `Flash` report. An application that runs them puts
 *  `CompletedAnnounce: {}` and `CompletedFlash: {}` in its own Message union, which these tags
 *  match, and its update changes nothing for them. */
export const Message = defineMessageUnion({
  CompletedAnnounce: {},
  CompletedFlash: {},
});

export type Message = typeof Message.Type;

/** The attribute that marks the page's live region, which a test finds it by: Loading's line
 *  is a `role="status"` too, so counting that role counts more than the one region. */
export const ANNOUNCER_ATTRIBUTE = "data-pixel-paper-announcer";

const ANNOUNCER_SELECTOR = `[${ANNOUNCER_ATTRIBUTE}]`;

/**
 * The page's one polite live region, empty until something is said. Render exactly one,
 * placed by the rule every pixel-paper application follows, because an open Dialog makes
 * everything outside it inert and hidden from screen readers: inside the topmost open Dialog,
 * otherwise at the end of the body. `LiveRegion.view` renders it with the toast stack, and
 * `LiveRegion.place` puts them where the rule says.
 */
export const view = <Message>(h: HtmlBuilder<Message>): Html =>
  h.div([
    h.Class("sr-only"),
    h.Role("status"),
    h.AriaLive("polite"),
    h.Attribute(ANNOUNCER_ATTRIBUTE, ""),
  ]);

const GATHER = Duration.millis(30);

const PENDING_ATTRIBUTE = "data-pixel-paper-announcing";

const topmostRegion = (): Option.Option<HTMLElement> => {
  const regions = Array.fromIterable(
    document.querySelectorAll<HTMLElement>(ANNOUNCER_SELECTOR)
  );

  return Option.orElse(
    Array.findLast(
      regions,
      (region) => region.closest("dialog[open]") !== null
    ),
    () => Array.last(regions)
  );
};

const gather = (region: HTMLElement, text: string): boolean => {
  const maybePending = Option.fromNullishOr(
    region.getAttribute(PENDING_ATTRIBUTE)
  );

  region.setAttribute(
    PENDING_ATTRIBUTE,
    Option.match(maybePending, {
      onNone: () => text,
      onSome: (said) => `${said} ${text}`,
    })
  );

  return Option.isNone(maybePending);
};

const speak = (region: HTMLElement): void => {
  region.textContent = region.getAttribute(PENDING_ATTRIBUTE) ?? "";
  region.removeAttribute(PENDING_ATTRIBUTE);
};

const sayIn = (region: HTMLElement, text: string): Effect.Effect<void> =>
  Effect.gen(function* () {
    const isFirst = yield* Effect.sync(() => gather(region, text));

    if (!isFirst) {
      return;
    }

    yield* Effect.sync(() => {
      region.textContent = "";
    });
    yield* Effect.sleep(GATHER);
    yield* Effect.sync(() => {
      speak(region);
    });
  });

export const announce = (text: string): Effect.Effect<void> =>
  Effect.gen(function* () {
    yield* Render.afterCommit;
    const maybeRegion = yield* Effect.sync(topmostRegion);
    yield* Option.match(maybeRegion, {
      onNone: () => Effect.void,
      onSome: (region) => sayIn(region, text),
    });
  });

const FLASH_ID = "pixel-paper-flash";

const TIME = /^(?<amount>(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)(?<unit>m?s)?$/iu;

const beatOf = (element: Element): Option.Option<number> => {
  const time = getComputedStyle(element)
    .getPropertyValue("--motion-flash")
    .trim();

  const groups = TIME.exec(time)?.groups;

  return pipe(
    Option.fromNullishOr(groups?.["amount"]),
    Option.map((amount) =>
      groups?.["unit"]?.toLowerCase() === "ms"
        ? Number(amount)
        : Number(amount) * 1000
    ),
    Option.filter(Number.isFinite)
  );
};

const prefersReducedMotion = (): boolean =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const runFlash = (element: Element, beat: number): void => {
  for (const animation of Array.filter(
    element.getAnimations(),
    (running) => running.id === FLASH_ID
  )) {
    animation.cancel();
  }

  if (prefersReducedMotion()) {
    const ring = "var(--line) solid var(--ink)";
    element.animate(
      { outline: [ring, ring], outlineOffset: ["-2px", "-2px"] },
      { duration: beat, id: FLASH_ID }
    );
  } else {
    element.animate(
      { filter: ["invert(1)", "invert(1)"] },
      { duration: beat / 2, delay: beat / 4, id: FLASH_ID }
    );
  }
};

export const flash = (selector: string): Effect.Effect<void> =>
  Effect.sync(() => {
    const maybeElement = Option.fromNullishOr(document.querySelector(selector));

    const maybeFlash = Option.flatMap(maybeElement, (element) =>
      Option.map(beatOf(element), (beat) => ({ element, beat }))
    );

    if (Option.isSome(maybeFlash)) {
      runFlash(maybeFlash.value.element, maybeFlash.value.beat);
    }
  });

/**
 * Says `text` to screen readers through the page's live region (see `view`). Words said in
 * the same moment are read together, and the region clears first, so the same words twice
 * are read twice. Without a region on the page it does nothing. Reports `CompletedAnnounce`.
 */
export const Announce = Command.define("Announce", {
  args: { text: Schema.String },
  messages: [Message.CompletedAnnounce],
  execute: ({ text }) =>
    announce(text).pipe(Effect.as(Message.CompletedAnnounce())),
});

/**
 * Inverts the element `selector` finds for one beat (`--motion-flash`): the signal that a
 * change was committed. A second flash mid-beat restarts it. With `prefers-reduced-motion`
 * it holds a still 2px ink ring for the beat instead. Return it beside `Announce`, which says
 * what the flash shows. Reports `CompletedFlash`.
 */
export const Flash = Command.define("Flash", {
  args: { selector: Schema.String },
  messages: [Message.CompletedFlash],
  execute: ({ selector }) =>
    flash(selector).pipe(Effect.as(Message.CompletedFlash())),
});
