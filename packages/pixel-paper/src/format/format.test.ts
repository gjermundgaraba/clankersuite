import { Duration, Option } from "effect";
import { describe, expect, it } from "vite-plus/test";

import {
  formatClock,
  formatDate,
  formatDateTime,
  formatRemaining,
  formatSpan,
} from "./format.ts";

const millis = (duration: Duration.Input): number =>
  Duration.toMillis(Duration.fromInputUnsafe(duration));

describe("formatSpan", () => {
  it("says a span in its largest whole unit, counting hours below two days", () => {
    expect(formatSpan(millis("45 seconds"))).toBe("45s");
    expect(formatSpan(millis("12 minutes"))).toBe("12m");
    expect(formatSpan(millis("47 hours"))).toBe("47h");
    expect(formatSpan(millis("19 days"))).toBe("19d");
    expect(formatSpan(-millis("3 minutes"))).toBe("3m");
  });
});

describe("formatRemaining", () => {
  it("adds the next unit down above an hour", () => {
    expect(formatRemaining(millis("12 minutes"))).toBe("12m");
    expect(formatRemaining(millis("101 minutes"))).toBe("1h 41m");
    expect(formatRemaining(millis("2 hours"))).toBe("2h");
    expect(formatRemaining(millis("76 hours"))).toBe("3d 4h");
  });
});

describe("formatClock", () => {
  it("prints minutes and seconds, and hours once there are any", () => {
    expect(formatClock(7.9)).toBe("0:07");
    expect(formatClock(760)).toBe("12:40");
    expect(formatClock(3729)).toBe("1:02:09");
  });

  it("prints an unknown place for a stream or a missing duration", () => {
    expect(formatClock(Number.POSITIVE_INFINITY)).toBe("-:--");
    expect(formatClock(Number.NaN)).toBe("-:--");
    expect(formatClock(-1)).toBe("-:--");
  });
});

describe("formatDate and formatDateTime", () => {
  const at = new Date(Date.UTC(2026, 2, 12, 14, 5));

  it("writes English dates in the zone given", () => {
    expect(formatDate(at, Option.some("UTC"))).toBe("12 Mar 2026");
    expect(formatDateTime(at, Option.some("UTC"))).toBe("12 Mar 2026, 14:05");
  });
});
