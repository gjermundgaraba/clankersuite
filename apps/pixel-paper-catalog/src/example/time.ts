import { Time } from "@gjermundgaraba/pixel-paper";
import { Duration, Option } from "effect";
import type { Html, HtmlBuilder } from "foldkit/html";

import { SAMPLE_MOMENT } from "../sample.ts";
import { rowView, specView } from "../spec.ts";

const sampleAt = (
  maybeOpenedAt: Option.Option<number>,
  offset: Duration.Duration
): number =>
  Option.getOrElse(maybeOpenedAt, () => SAMPLE_MOMENT) +
  Duration.toMillis(offset);

const ago = (duration: Duration.Input): Duration.Duration =>
  Duration.negate(Duration.fromInputUnsafe(duration));

export const view = <Message>(
  maybeNow: Option.Option<number>,
  maybeOpenedAt: Option.Option<number>,
  h: HtmlBuilder<Message>
): Html =>
  rowView(
    [
      specView(
        "age",
        [
          Time.view(
            { at: sampleAt(maybeOpenedAt, ago("4 minutes")), maybeNow },
            h
          ),
        ],
        h
      ),
      specView(
        "ago",
        [
          Time.view(
            {
              at: sampleAt(maybeOpenedAt, ago("2 hours")),
              format: "Ago",
              maybeNow,
            },
            h
          ),
        ],
        h
      ),
      specView(
        "a stale age: older than a day",
        [
          Time.view(
            {
              at: sampleAt(maybeOpenedAt, ago("19 days")),
              maybeNow,
              staleAfter: Duration.days(1),
            },
            h
          ),
        ],
        h
      ),
      specView(
        "a countdown that crosses zero a minute after the page opened",
        [
          Time.view(
            {
              at: sampleAt(maybeOpenedAt, Duration.minutes(1)),
              format: "Until",
              maybeNow,
              passed: "reset due",
              isLate: true,
            },
            h
          ),
        ],
        h
      ),
      specView(
        "date and time, in your zone",
        [
          Time.view(
            {
              at: sampleAt(maybeOpenedAt, ago("3 days")),
              format: "DateTime",
              maybeNow,
            },
            h
          ),
        ],
        h
      ),
    ],
    h
  );
