import { Option } from "effect";
import { Scene } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { describe, expect, it } from "vite-plus/test";

import * as ChartTable from "./chart-table.ts";

describe("ChartTable readings", () => {
  it("drops missing and unreadable values, and tops the scale at the largest reading", () => {
    expect(ChartTable.chartValue(Option.some(Number.NaN))).toStrictEqual(
      Option.none()
    );
    expect(ChartTable.chartValue(Option.some(4))).toStrictEqual(Option.some(4));
    expect(
      ChartTable.chartTop(
        [Option.some(3), Option.none(), Option.some(9)],
        Option.none()
      )
    ).toBe(9);
    expect(ChartTable.chartTop([Option.some(-3)], Option.none())).toBe(0);
    expect(ChartTable.chartTop([Option.some(3)], Option.some(20))).toBe(20);
  });

  it("prints every label up to eight, then every nth", () => {
    expect(ChartTable.labelStep(8)).toBe(1);
    expect(ChartTable.labelStep(9)).toBe(2);
    expect(ChartTable.labelStep(30)).toBe(4);
  });
});

describe("ChartTable view", () => {
  it("is a captioned table with column heads and a row header per point", () => {
    Scene.scene(
      {
        update: (model: null) => ({ model }),
        view: (_model: null, h: HtmlBuilder<never>) =>
          ChartTable.view(
            {
              label: "Requests by day",
              heads: ["Day", "Requests"],
              rows: [{ label: "Mon", readings: ["1,200"] }],
            },
            h
          ),
      },
      Scene.given(null),
      Scene.expect(Scene.role("table", { name: "Requests by day" })).toExist(),
      Scene.expect(Scene.role("columnheader", { name: "Requests" })).toHaveAttr(
        "scope",
        "col"
      ),
      Scene.expect(Scene.role("rowheader", { name: "Mon" })).toHaveAttr(
        "scope",
        "row"
      ),
      Scene.expect(Scene.role("cell")).toHaveText("1,200")
    );
  });
});
