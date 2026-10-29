import {
  Clock,
  Duration,
  Match,
  Option,
  Schedule,
  Schema,
  Stream,
} from "effect";
import type { Html, HtmlBuilder } from "foldkit/html";
import type { EntryWithoutKeepAlive } from "foldkit/subscription";

import {
  formatDate,
  formatDateTime,
  formatRemaining,
  formatSpan,
} from "../format/format.ts";

/** How a moment is said. `Age`: `"19d"`, the age register. `Ago`: `"4m ago"`. `Until`:
 *  `"in 1h 41m"`. `Date`: `"12 Mar 2026"`. `DateTime`: `"12 Mar 2026, 14:05"`, in the reader's
 *  zone. */
export const TimeFormat = Schema.Literals([
  "Age",
  "Ago",
  "Until",
  "Date",
  "DateTime",
]);

export type TimeFormat = typeof TimeFormat.Type;

const JUST_NOW = Duration.toMillis(Duration.seconds(10));
const UTC = Option.some("UTC");

type Look = Readonly<{ maybeClass: Option.Option<string>; text: string }>;

/** Configuration for rendering a moment with `view`. */
export type ViewConfig = Readonly<{
  /** The moment, in epoch milliseconds. */
  at: number;
  format?: TimeFormat;
  /** The current time from the caller's Model, kept by `clockEntry`. `None` until the clock
   *  first ticks, as during a server render: the moment then prints in UTC, so the server and
   *  the browser write the same text. */
  maybeNow: Option.Option<number>;
  /** `Until`: printed once the moment has gone (`"reset due"`, `"expired"`). */
  passed?: string;
  /** `Until`: a passed moment prints red, as a late due day. */
  isLate?: boolean;
  /** `Age` and `Ago`: older than this prints red, as a stale age. */
  staleAfter?: Duration.Duration;
}>;

const utcLook = (at: number, format: TimeFormat): Look => ({
  maybeClass: Option.none(),
  text:
    format === "Date"
      ? formatDate(new Date(at), UTC)
      : `${formatDateTime(new Date(at), UTC)} UTC`,
});

const untilLook = (left: number, passed: string, isLate: boolean): Look =>
  left <= 0
    ? { maybeClass: Option.some(isLate ? "due late" : "due"), text: passed }
    : { maybeClass: Option.some("due"), text: `in ${formatRemaining(left)}` };

const ageLook = (
  age: number,
  format: "Age" | "Ago",
  maybeStaleAfter: Option.Option<Duration.Duration>
): Look => {
  const isStale = Option.exists(
    maybeStaleAfter,
    (staleAfter) => age > Duration.toMillis(staleAfter)
  );

  const maybeClass = Option.some(isStale ? "age stale" : "age");

  if (age < JUST_NOW) {
    return { maybeClass, text: format === "Ago" ? "just now" : "now" };
  }

  return {
    maybeClass,
    text: format === "Ago" ? `${formatSpan(age)} ago` : formatSpan(age),
  };
};

const localLook = (
  config: ViewConfig,
  format: TimeFormat,
  now: number
): Look => {
  const maybeStaleAfter = Option.fromNullishOr(config.staleAfter);

  return Match.value(format).pipe(
    Match.withReturnType<Look>(),
    Match.when("Date", () => ({
      maybeClass: Option.none(),
      text: formatDate(new Date(config.at)),
    })),
    Match.when("DateTime", () => ({
      maybeClass: Option.none(),
      text: formatDateTime(new Date(config.at)),
    })),
    Match.when("Until", () =>
      untilLook(config.at - now, config.passed ?? "now", config.isLate ?? false)
    ),
    Match.when("Age", () => ageLook(now - config.at, "Age", maybeStaleAfter)),
    Match.when("Ago", () => ageLook(now - config.at, "Ago", maybeStaleAfter)),
    Match.exhaustive
  );
};

/** A moment, said relative to the caller's `maybeNow` or as a date, in a `<time>` whose
 *  `datetime` is the moment in ISO form. Stale ages and late due days print red. */
export const view = <Message>(
  config: ViewConfig,
  h: HtmlBuilder<Message>
): Html => {
  const format = config.format ?? "Age";

  const { maybeClass, text } = Option.match(config.maybeNow, {
    onNone: () => utcLook(config.at, format),
    onSome: (now) => localLook(config, format, now),
  });

  return h.time(
    [
      h.Datetime(new Date(config.at).toISOString()),
      ...(Option.isSome(maybeClass) ? [h.Class(maybeClass.value)] : []),
    ],
    [text]
  );
};

const TICK = Duration.seconds(1);

/** Configuration for the `clockEntry` Subscription helper. */
export type ClockConfig<Model, Message> = Readonly<{
  /** Whether anything on the page reads the clock; it stops while this is false. */
  isActive: (model: Model) => boolean;
  toMessage: (now: number) => Message;
}>;

/** A Subscription entry that emits the current time in epoch milliseconds at once and then
 *  once a second while `isActive`. Keep the value in the Model and hand it to `view` as
 *  `maybeNow`, so every Time on the page reads one clock. Pass it into `Subscription.make` as
 *  an entry value. */
export const clockEntry = <Model, Message>(
  config: ClockConfig<Model, Message>
): EntryWithoutKeepAlive<
  Model,
  Message,
  Readonly<{ isActive: boolean }>,
  never
> => ({
  dependenciesSchema: Schema.Struct({ isActive: Schema.Boolean }),
  modelToDependencies: (model) => ({ isActive: config.isActive(model) }),
  dependenciesToStream: ({ isActive }) =>
    isActive
      ? Stream.fromEffectSchedule(
          Clock.currentTimeMillis,
          Schedule.spaced(TICK)
        ).pipe(Stream.map(config.toMessage))
      : Stream.empty,
});
