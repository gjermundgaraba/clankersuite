import { Option } from "effect";
import { Scene } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { describe, it } from "vite-plus/test";

import * as LineChart from "./line-chart.ts";

const chartScene = (config: Partial<LineChart.ViewConfig>) => ({
  update: (model: null) => ({ model }),
  view: (_model: null, h: HtmlBuilder<never>) =>
    LineChart.view(
      {
        label: "Latency",
        labels: ["v1", "v2", "v3"],
        series: [
          {
            name: "p50",
            values: [Option.some(40), Option.none(), Option.some(80)],
          },
          { name: "p95", values: [Option.some(90), Option.some(120)] },
        ],
        unit: "ms",
        category: "Version",
        ...config,
      },
      h
    ),
});

describe("LineChart", () => {
  it("reads as a table with a column per series, missing readings said", () => {
    Scene.scene(
      chartScene({}),
      Scene.given(null),
      Scene.expect(Scene.role("table", { name: "Latency" })).toExist(),
      Scene.expect(Scene.role("columnheader", { name: "p95" })).toExist(),
      Scene.expect(Scene.role("rowheader", { name: "v2" })).toExist(),
      Scene.expect(Scene.role("cell", { name: "40 ms" })).toExist(),
      Scene.expectAll(
        Scene.all.role("cell", { name: "no reading" })
      ).toHaveCount(2),
      Scene.expect(Scene.selector(".line-chart")).toHaveAttr(
        "aria-hidden",
        "true"
      )
    );
  });

  it("keys two series, the second printed under the first", () => {
    Scene.scene(
      chartScene({}),
      Scene.given(null),
      Scene.expectAll(Scene.all.selector(".chart-key li")).toHaveCount(2),
      Scene.expect(Scene.first(Scene.all.selector("svg g"))).toHaveClass(
        "second"
      ),
      Scene.expect(Scene.selector(".line-scale span")).toHaveText("120"),
      Scene.expect(
        Scene.first(Scene.all.selector(".line-labels span"))
      ).toHaveClass("first"),
      Scene.expect(
        Scene.last(Scene.all.selector(".line-labels span"))
      ).toHaveStyle("left", "100%")
    );
  });

  it("says it has nothing to chart without labels", () => {
    Scene.scene(
      chartScene({ labels: [] }),
      Scene.given(null),
      Scene.expect(Scene.selector(".empty strong")).toHaveText(
        "nothing to chart"
      )
    );
  });
});
