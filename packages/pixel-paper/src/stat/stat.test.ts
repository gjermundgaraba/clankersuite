import { Option } from "effect";
import { Scene } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { describe, it } from "vite-plus/test";

import * as Stat from "./stat.ts";

describe("Stat", () => {
  it("prints each figure as a term and its value, with the change said in words", () => {
    Scene.scene(
      {
        update: (model: null) => ({ model }),
        view: (_model: null, h: HtmlBuilder<never>) =>
          Stat.listView(
            {
              stats: [
                {
                  label: "Requests today",
                  maybeValue: Option.some(41_200),
                  delta: 12,
                  deltaUnit: "%",
                  note: ["against yesterday"],
                },
                { label: "Latency", maybeValue: Option.none(), unit: "ms" },
                {
                  label: "Errors",
                  maybeValue: Option.some(3),
                  isLoading: true,
                  delta: -1,
                },
                {
                  label: "Queue",
                  maybeValue: Option.some(0),
                  delta: 0,
                  tone: "Warn",
                },
              ],
            },
            h
          ),
      },
      Scene.given(null),
      Scene.expect(Scene.first(Scene.all.selector(".stat-value"))).toHaveText(
        "41,200"
      ),
      Scene.expect(Scene.first(Scene.all.selector(".stat-delta"))).toHaveText(
        "up12%"
      ),
      Scene.expect(Scene.selector(".stat-value.unknown")).toHaveText(
        "—not known"
      ),
      Scene.expect(Scene.selector(".stat-value[aria-busy]")).toHaveText(
        "loading"
      ),
      Scene.expectAll(Scene.all.selector(".stat-delta")).toHaveCount(2),
      Scene.expect(Scene.last(Scene.all.selector(".stat-delta"))).toHaveClass(
        "warn"
      ),
      Scene.expect(Scene.last(Scene.all.selector(".stat-delta"))).toHaveText(
        "no change,0"
      ),
      Scene.expect(Scene.selector(".stat-note")).toHaveText("against yesterday")
    );
  });
});
