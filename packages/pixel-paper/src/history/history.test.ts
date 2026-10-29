import { Scene } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { describe, it } from "vite-plus/test";

import * as History from "./history.ts";

const entries: readonly History.Entry[] = [
  {
    id: "4",
    at: ["v4"],
    who: ["sam"],
    what: ["Raised the limit"],
    isCurrent: true,
  },
  { id: "3", at: ["v3"], what: ["Rollback failed"], isFailed: true },
];

describe("History", () => {
  it("is an ordered list named for screen readers, newest first", () => {
    Scene.scene(
      {
        update: (model: null) => ({ model }),
        view: (_model: null, h: HtmlBuilder<never>) =>
          History.view(
            {
              entries,
              label: "Workspace activity, newest first",
              isWrapped: true,
              variant: "Checks",
            },
            h
          ),
      },
      Scene.given(null),
      Scene.expect(
        Scene.role("list", { name: "Workspace activity, newest first" })
      ).toHaveClass("wrapped"),
      Scene.expect(Scene.selector("ol.history-list")).not.toHaveClass("wrap"),
      Scene.expect(Scene.selector("ol.history-list")).toHaveClass("checks"),
      Scene.expect(Scene.first(Scene.all.role("listitem"))).toHaveClass(
        "current"
      ),
      Scene.expect(Scene.first(Scene.all.role("listitem"))).toHaveAttr(
        "aria-current",
        "true"
      ),
      Scene.expect(Scene.last(Scene.all.role("listitem"))).not.toHaveAttr(
        "aria-current"
      ),
      Scene.expect(
        Scene.first(Scene.all.selector(".history-list .v"))
      ).toHaveText("v4"),
      Scene.expect(
        Scene.first(Scene.all.selector(".history-list .who"))
      ).toHaveText("sam"),
      Scene.expect(
        Scene.last(Scene.all.selector(".history-list .what"))
      ).toHaveClass("failed"),
      Scene.expect(
        Scene.last(Scene.all.selector(".history-list .what"))
      ).toHaveText("Rollback failed (failed)"),
      Scene.expectAll(Scene.all.selector(".history-list .who")).toHaveCount(1)
    );
  });
});
