import { Option } from "effect";
import { Scene } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { describe, it } from "vite-plus/test";

import * as Stat from "./stat.ts";

describe("Stat", () => {
  it("prints each figure as a term and its value, and an unknown one as a dash", () => {
    Scene.scene(
      {
        update: (model: null) => ({ model }),
        view: (_model: null, h: HtmlBuilder<never>) =>
          Stat.listView(
            {
              stats: [
                { label: "Requests today", maybeValue: Option.some(41_200) },
                { label: "Latency", maybeValue: Option.none() },
              ],
            },
            h
          ),
      },
      Scene.given(null),
      Scene.expect(Scene.first(Scene.all.selector(".stat dt"))).toHaveText(
        "Requests today"
      ),
      Scene.expect(Scene.first(Scene.all.selector(".stat-value"))).toHaveText(
        "41,200"
      ),
      Scene.expect(Scene.selector(".stat-value.unknown")).toHaveText(
        "—not known"
      )
    );
  });
});
