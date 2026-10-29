import { Duration, Match, Option, pipe } from "effect";

import { LOCALE } from "../locale/locale.ts";

const SECOND = Duration.toMillis(Duration.seconds(1));
const MINUTE = Duration.toMillis(Duration.minutes(1));
const HOUR = Duration.toMillis(Duration.hours(1));
const DAY = Duration.toMillis(Duration.days(1));
const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 3600;

export const UNKNOWN_CLOCK = "-:--";

const dateFormat = (timeZone: Option.Option<string>) =>
  new Intl.DateTimeFormat(LOCALE, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: Option.getOrUndefined(timeZone),
  });

const dateTimeFormat = (timeZone: Option.Option<string>) =>
  new Intl.DateTimeFormat(LOCALE, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: Option.getOrUndefined(timeZone),
  });

/** A day as `"12 Mar 2026"`, in the reader's zone unless `timeZone` names another. Always
 *  English, so the server and every browser write the same words. */
export const formatDate = (
  at: Date,
  timeZone: Option.Option<string> = Option.none()
): string => dateFormat(timeZone).format(at);

export const formatDateTime = (
  at: Date,
  timeZone: Option.Option<string> = Option.none()
): string => dateTimeFormat(timeZone).format(at);

export const formatSpan = (milliseconds: number): string => {
  const span = Math.abs(milliseconds);

  return Match.value(span).pipe(
    Match.when(
      (value) => value < MINUTE,
      (value) => `${Math.floor(value / SECOND)}s`
    ),
    Match.when(
      (value) => value < HOUR,
      (value) => `${Math.floor(value / MINUTE)}m`
    ),
    Match.when(
      (value) => value < 2 * DAY,
      (value) => `${Math.floor(value / HOUR)}h`
    ),
    Match.orElse((value) => `${Math.floor(value / DAY)}d`)
  );
};

const twoUnits = (
  milliseconds: number,
  [large, small, largeUnit, smallUnit]: readonly [
    number,
    number,
    string,
    string,
  ]
): string => {
  const whole = Math.floor(milliseconds / large);
  const rest = Math.floor((milliseconds % large) / small);

  return rest === 0
    ? `${whole}${largeUnit}`
    : `${whole}${largeUnit} ${rest}${smallUnit}`;
};

export const formatRemaining = (milliseconds: number): string => {
  if (milliseconds < HOUR) {
    return formatSpan(milliseconds);
  } else if (milliseconds < 2 * DAY) {
    return twoUnits(milliseconds, [HOUR, MINUTE, "h", "m"]);
  }

  return twoUnits(milliseconds, [DAY, HOUR, "d", "h"]);
};

const twoDigits = (value: number): string => `${value}`.padStart(2, "0");

export const formatClock = (seconds: number): string =>
  pipe(
    Option.liftPredicate(
      seconds,
      (value) => Number.isFinite(value) && value >= 0
    ),
    Option.map(Math.floor),
    Option.match({
      onNone: () => UNKNOWN_CLOCK,
      onSome: (whole) => {
        const hours = Math.floor(whole / SECONDS_PER_HOUR);

        const minutes = Math.floor(
          (whole % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE
        );

        const rest = twoDigits(whole % SECONDS_PER_MINUTE);

        return hours > 0
          ? `${hours}:${twoDigits(minutes)}:${rest}`
          : `${minutes}:${rest}`;
      },
    })
  );
