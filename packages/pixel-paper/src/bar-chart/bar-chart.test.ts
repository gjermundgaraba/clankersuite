import { Array, Option } from "effect";
import { Scene } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { describe, it } from "vite-plus/test";

import * as BarChart from "./bar-chart.ts";

const points: readonly BarChart.BarPoint[] = [
  { label: "Mon", maybeValue: Option.some(10) },
  { label: "Tue", maybeValue: Option.some(5), tone: "Warn" },
  { label: "Wed", maybeValue: Option.none() },
  { label: "Thu", maybeValue: Option.some(1), tone: "Error" },
];

const chartScene = (config: Partial<BarChart.ViewConfig>) => ({
  update: (model: null) => ({ model }),
  view: (_model: null, h: HtmlBuilder<never>) =>
    BarChart.view(
      {
        label: "Requests by day",
        points,
        category: "Day",
        unit: "requests",
        ...config,
      },
      h
    ),
});

describe("BarChart", () => {
  it("reads as a table and hides the picture from screen readers", () => {
    Scene.scene(
      chartScene({}),
      Scene.given(null),
      Scene.expect(Scene.role("table", { name: "Requests by day" })).toExist(),
      Scene.expect(
        Scene.role("columnheader", { name: "Value (requests)" })
      ).toExist(),
      Scene.expect(Scene.role("cell", { name: "5, warning" })).toExist(),
      Scene.expect(Scene.role("cell", { name: "no reading" })).toExist(),
      Scene.expect(Scene.role("cell", { name: "1, error" })).toExist(),
      Scene.expect(Scene.selector(".bar-cols")).toHaveAttr(
        "aria-hidden",
        "true"
      ),
      Scene.expect(Scene.selector(".bar-cols")).toHaveClass("each"),
      Scene.expect(Scene.selector(".bar-cols")).toHaveStyle("--n", "4")
    );
  });

  it("lights cells up to each value, at least one for a value above zero", () => {
    Scene.scene(
      chartScene({}),
      Scene.given(null),
      Scene.expectAll(Scene.all.selector(".bar-cells .cell.on")).toHaveCount(
        10 + 5 + 0 + 1
      ),
      Scene.expect(Scene.selector(".chip.blocked")).toHaveText("1"),
      Scene.expect(Scene.selector(".mark.reading")).toHaveText("5"),
      Scene.expect(Scene.selector(".bar-num.none")).toHaveText("no reading")
    );
  });

  it("prints a bar per line as rows", () => {
    Scene.scene(
      chartScene({ isRows: true, max: 20 }),
      Scene.given(null),
      Scene.expect(Scene.selector(".bar-rows")).toHaveStyle("--cells", "20"),
      Scene.expectAll(Scene.all.selector(".bar-cells .cell.on")).toHaveCount(
        10 + 5 + 0 + 1
      )
    );
  });

  it("labels only every nth column past twelve", () => {
    Scene.scene(
      chartScene({
        points: Array.makeBy(16, (index) => ({
          label: `d${index}`,
          maybeValue: Option.some(index),
        })),
      }),
      Scene.given(null),
      Scene.expect(Scene.selector(".bar-cols")).not.toHaveClass("each"),
      Scene.expectAll(Scene.all.selector(".bar-label")).toHaveCount(8),
      Scene.expectAll(Scene.all.selector(".bar-num")).toHaveCount(0)
    );
  });

  it("says it has nothing to chart", () => {
    Scene.scene(
      chartScene({ points: [], empty: "no requests yet" }),
      Scene.given(null),
      Scene.expect(Scene.selector(".empty strong")).toHaveText(
        "no requests yet"
      )
    );
  });
});
