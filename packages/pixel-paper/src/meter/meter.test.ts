import { Scene } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { describe, it } from "vite-plus/test";

import * as Meter from "./meter.ts";

const staticScene = (
  view: (h: HtmlBuilder<never>) => ReturnType<typeof Meter.listView>
) => ({
  update: (model: null) => ({ model }),
  view: (_model: null, h: HtmlBuilder<never>) => view(h),
});

const meter = Scene.role("meter", { name: "Requests" });

describe("Meter", () => {
  it("is a meter named by its label, with its value, maximum and numbers in words", () => {
    Scene.scene(
      staticScene((h) =>
        Meter.listView(
          {
            meters: [
              {
                id: "requests",
                label: "Requests",
                detail: ["this month"],
                value: 41_200,
                max: 50_000,
                unit: "requests",
                foot: ["Resets in 4 days"],
              },
            ],
          },
          h
        )
      ),
      Scene.given(null),
      Scene.expect(meter).toHaveAttr("aria-valuenow", "41200"),
      Scene.expect(meter).toHaveAttr("aria-valuemin", "0"),
      Scene.expect(meter).toHaveAttr("aria-valuemax", "50000"),
      Scene.expect(meter).toHaveAttr(
        "aria-valuetext",
        "41,200 / 50,000 requests"
      ),
      Scene.expectAll(Scene.all.selector(".cells .cell.on")).toHaveCount(16),
      Scene.expect(Scene.selector(".mark.reading")).toHaveText("82%"),
      Scene.expect(Scene.selector(".meter-detail")).toHaveText("this month"),
      Scene.expect(Scene.selector(".meter-foot")).toHaveText(
        "Resets in 4 days"
      ),
      Scene.expect(Scene.selector("ul.meters li.meter-row")).toExist()
    );
  });

  it("prints a plain percentage below high and a red chip at the maximum", () => {
    Scene.scene(
      staticScene((h) =>
        Meter.listView(
          {
            meters: [
              { id: "low", label: "Storage", value: 10, max: 100 },
              {
                id: "full",
                label: "Seats",
                value: 5,
                max: 5,
                full: "full",
                isStale: true,
              },
            ],
          },
          h
        )
      ),
      Scene.given(null),
      Scene.expect(Scene.selector(".pct")).toHaveText("10%"),
      Scene.expect(Scene.selector(".chip.blocked")).toHaveText("full"),
      Scene.expect(Scene.last(Scene.all.selector(".meter-row"))).toHaveClass(
        "stale"
      ),
      Scene.expect(Scene.role("meter", { name: "Seats (stale)" })).toHaveAttr(
        "aria-valuetext",
        "5 / 5"
      )
    );
  });

  it("never prints 100% or every cell below the maximum", () => {
    Scene.scene(
      staticScene((h) =>
        Meter.listView(
          {
            meters: [
              { id: "requests", label: "Requests", value: 49_999, max: 50_000 },
            ],
          },
          h
        )
      ),
      Scene.given(null),
      Scene.expectAll(Scene.all.selector(".cells .cell.on")).toHaveCount(19),
      Scene.expect(Scene.selector(".mark.reading")).toHaveText("99%"),
      Scene.expect(Scene.selector(".chip.blocked")).toBeAbsent(),
      Scene.expect(meter).toExist()
    );
  });

  it("leaves out the numbers line on request and still reads them out", () => {
    Scene.scene(
      staticScene((h) =>
        Meter.listView(
          {
            meters: [
              {
                id: "window",
                label: "Window",
                value: 62,
                max: 100,
                valueText: "62% used",
                hasNumbers: false,
              },
            ],
          },
          h
        )
      ),
      Scene.given(null),
      Scene.expect(Scene.selector(".pct")).toHaveText("62%"),
      Scene.expect(Scene.selector(".meter-num")).toBeAbsent(),
      Scene.expect(Scene.role("meter", { name: "Window" })).toHaveAttr(
        "aria-valuetext",
        "62% used"
      )
    );
  });

  it("tones the cells of a toned meter by its level, and only those", () => {
    Scene.scene(
      staticScene((h) =>
        Meter.listView(
          {
            meters: [
              {
                id: "low",
                label: "Session",
                value: 10,
                max: 100,
                isToned: true,
              },
              {
                id: "high",
                label: "Weekly",
                value: 85,
                max: 100,
                isToned: true,
              },
              {
                id: "full",
                label: "Monthly",
                value: 100,
                max: 100,
                isToned: true,
              },
              { id: "plain", label: "Storage", value: 90, max: 100 },
            ],
          },
          h
        )
      ),
      Scene.given(null),
      Scene.expectAll(Scene.all.selector(".meter-row.toned")).toHaveCount(3),
      Scene.expectAll(Scene.all.selector(".meter-row.toned.high")).toHaveCount(
        1
      ),
      Scene.expectAll(Scene.all.selector(".meter-row.toned.full")).toHaveCount(
        1
      ),
      Scene.expect(
        Scene.last(Scene.all.selector(".meter-row"))
      ).not.toHaveClass("toned"),
      Scene.expectAll(Scene.all.selector(".mark.reading")).toHaveCount(2),
      Scene.expect(Scene.selector(".chip.blocked")).toHaveText("100%")
    );
  });
});

describe("Meter cells", () => {
  it("is a meter from none to its count, read as its value text", () => {
    Scene.scene(
      staticScene((h) =>
        Meter.cellsView(
          {
            id: "strength",
            count: 4,
            on: 3,
            label: "Strength",
            valueText: "strong",
            isShort: true,
          },
          h
        )
      ),
      Scene.given(null),
      Scene.expect(Scene.role("meter", { name: "Strength" })).toHaveAttr(
        "aria-valuenow",
        "3"
      ),
      Scene.expect(Scene.role("meter")).toHaveAttr("aria-valuemax", "4"),
      Scene.expect(Scene.role("meter")).toHaveAttr("aria-valuetext", "strong"),
      Scene.expect(Scene.role("meter")).toHaveClass("short"),
      Scene.expectAll(Scene.all.selector(".cell.on")).toHaveCount(3)
    );
  });
});
