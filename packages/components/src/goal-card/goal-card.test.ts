import { Scene } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { describe, it } from "vite-plus/test";

import * as GoalCard from "./goal-card.ts";

const card = (_model: null, h: HtmlBuilder<never>) =>
  GoalCard.view(
    {
      id: "goal-beta",
      title: "Ship the beta",
      colour: "Amber",
      description: "Get real users on it.",
      steps: [
        { label: "Ten users", isDone: false },
        { label: "Docs published", isDone: true },
      ],
      meta: "1 of 2 outcomes · 4 open tasks",
      columns: [
        { label: "Outcomes", body: ["Ten users", "Docs published"] },
        { label: "Moving it", body: ["Review budget"] },
      ],
    },
    h
  );

describe("GoalCard", () => {
  it("is an article named by its title, its columns regions named by their headings", () => {
    Scene.scene(
      { update: (model: null) => ({ model }), view: card },
      Scene.given(null),
      Scene.expect(Scene.role("article", { name: "Ship the beta" })).toExist(),
      Scene.expect(
        Scene.role("heading", { level: 2, name: "Ship the beta" })
      ).toExist(),
      Scene.expect(Scene.role("region", { name: "Outcomes" })).toContainText(
        "Docs published"
      ),
      Scene.expect(Scene.role("region", { name: "Moving it" })).toContainText(
        "Review budget"
      ),
      Scene.expect(Scene.text("1 of 2 outcomes · 4 open tasks")).toExist()
    );
  });

  it("fills the step of each done outcome, in its order, and hides the steps and the ring", () => {
    Scene.scene(
      { update: (model: null) => ({ model }), view: card },
      Scene.given(null),
      Scene.expect(Scene.selector(".gg-goal-steps")).toHaveAttr(
        "aria-hidden",
        "true"
      ),
      Scene.expect(
        Scene.first(Scene.all.selector(".gg-goal-steps span"))
      ).toHaveClass("gg-off"),
      Scene.expect(
        Scene.last(Scene.all.selector(".gg-goal-steps span"))
      ).toHaveClass("gg-on"),
      Scene.expect(Scene.selector(".gg-goal-ring")).toHaveAttr(
        "aria-hidden",
        "true"
      )
    );
  });
});
