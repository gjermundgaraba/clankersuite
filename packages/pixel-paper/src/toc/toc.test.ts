import { Effect, Fiber, Option, Stream } from "effect";
import { Scene } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { describe, expect, it } from "vite-plus/test";

import { settleUntil } from "../test/settle.ts";
import * as Toc from "./toc.ts";

const entries: readonly Toc.Entry[] = [
  { id: "before", label: "Before the window", level: 2 },
  { id: "checks", label: "Checks", level: 3 },
  { id: "links", label: "Links", level: 2 },
];

const tocScene = {
  update: (model: Option.Option<string>) => ({ model }),
  view: (model: Option.Option<string>, h: HtmlBuilder<never>) =>
    Toc.view({ entries, maybeCurrentId: model }, h),
};

describe("Toc view", () => {
  it("is a navigation of links that marks the heading being read as current", () => {
    Scene.scene(
      tocScene,
      Scene.given(Option.some("checks")),
      Scene.expect(
        Scene.role("navigation", { name: "On this page" })
      ).toExist(),
      Scene.expect(Scene.role("link", { name: "Checks" })).toHaveAttr(
        "aria-current",
        "true"
      ),
      Scene.expect(Scene.role("link", { name: "Checks" })).toHaveAttr(
        "href",
        "#checks"
      ),
      Scene.expect(Scene.role("link", { name: "Links" })).not.toHaveAttr(
        "aria-current"
      ),
      Scene.expect(Scene.selector("li.l3")).toHaveText("Checks")
    );
  });

  it("puts an entry's detail under its words, inside the link", () => {
    Scene.scene(
      {
        update: (model: Option.Option<string>) => ({ model }),
        view: (model: Option.Option<string>, h: HtmlBuilder<never>) =>
          Toc.view(
            {
              entries: [
                {
                  id: "board",
                  label: "Board",
                  level: 2,
                  detail: [h.small([], ["Board.view"])],
                },
              ],
              maybeCurrentId: model,
            },
            h
          ),
      },
      Scene.given(Option.none()),
      Scene.expect(
        Scene.selector("a[href='#board'] .toc-entry small")
      ).toHaveText("Board.view"),
      Scene.expect(Scene.selector("a[href='#board'] .toc-entry")).toHaveText(
        "BoardBoard.view"
      )
    );
  });

  it("marks the first heading before the position is known", () => {
    Scene.scene(
      tocScene,
      Scene.given(Option.none()),
      Scene.expect(
        Scene.role("link", { name: "Before the window" })
      ).toHaveAttr("aria-current", "true")
    );
  });
});

const placeHeading = (id: string, top: number): HTMLElement => {
  const heading = document.createElement("h2");
  heading.id = id;
  heading.getBoundingClientRect = () => new DOMRect(0, top, 100, 20);
  document.body.append(heading);

  return heading;
};

describe("Toc reading position", () => {
  it("reports the last heading past the upper fifth, at once and as the page scrolls", async () => {
    document.body.innerHTML = "";
    window.innerHeight = 1000;
    placeHeading("before", -400);
    const checks = placeHeading("checks", 150);
    placeHeading("links", 900);

    const entry = Toc.readingPositionEntry({
      headingIds: (model: readonly string[]) => model,
      toMessage: (id) => id,
    });

    const dependencies = entry.modelToDependencies([
      "before",
      "checks",
      "links",
    ]);

    const reported: string[] = [];

    const fiber = Effect.runFork(
      entry.dependenciesToStream(dependencies).pipe(
        Stream.take(2),
        Stream.runForEach((id) => Effect.sync(() => reported.push(id)))
      )
    );

    await settleUntil(() => reported.length === 1);
    checks.getBoundingClientRect = () => new DOMRect(0, 400, 100, 20);
    await settleUntil(() => {
      window.dispatchEvent(new Event("scroll"));

      return reported.length === 2;
    });
    await Effect.runPromise(Fiber.interrupt(fiber));

    expect(reported).toStrictEqual(["checks", "before"]);
  });
});
