import { Scene } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { describe, it } from "vite-plus/test";

import * as Panel from "./panel.ts";

const panelView =
  (config: Partial<Panel.ViewConfig>) =>
  (_model: null, h: HtmlBuilder<never>) =>
    Panel.view(
      {
        id: "queue",
        title: "Queue",
        meta: "12",
        body: [h.p([], ["Twelve waiting."])],
        ...config,
      },
      h
    );

const region = Scene.role("region", { name: "Queue" });

describe("Panel", () => {
  it("is a region named by its title, with its lead, meta, actions, shelf and foot", () => {
    Scene.scene(
      {
        update: (model: null) => ({ model }),
        view: panelView({
          lead: ["grip"],
          actions: ["act"],
          shelf: ["area"],
          foot: ["note"],
          footActions: ["save"],
        }),
      },
      Scene.given(null),
      Scene.expect(region).toHaveClass("gg-panel"),
      Scene.expect(Scene.role("heading", { name: "Queue" })).toHaveId(
        "queue-title"
      ),
      Scene.expect(Scene.selector(".gg-panel-tb .gg-panel-lead")).toHaveText(
        "grip"
      ),
      Scene.expect(Scene.selector(".gg-panel-tb .gg-meta")).toHaveText("12"),
      Scene.expect(Scene.selector(".gg-panel-tb .gg-panel-acts")).toHaveText(
        "act"
      ),
      Scene.expect(Scene.selector(".gg-panel .gg-panel-shelf")).toHaveText(
        "area"
      ),
      Scene.expect(Scene.selector(".gg-panel-body p")).toHaveText(
        "Twelve waiting."
      ),
      Scene.expect(Scene.selector(".gg-panel-foot")).toHaveText("notesave"),
      Scene.expect(Scene.selector(".gg-panel-foot .gg-push")).toHaveText("save")
    );
  });

  it("is named by its name, where one is given, under the same title", () => {
    Scene.scene(
      {
        update: (model: null) => ({ model }),
        view: panelView({ name: "Queue, night shift" }),
      },
      Scene.given(null),
      Scene.expect(
        Scene.role("region", { name: "Queue, night shift" })
      ).toHaveClass("gg-panel"),
      Scene.expect(Scene.role("heading", { name: "Queue" })).toExist()
    );
  });

  it("puts a flush body edge to edge, without the padded body or a foot", () => {
    Scene.scene(
      {
        update: (model: null) => ({ model }),
        view: panelView({ isFlush: true }),
      },
      Scene.given(null),
      Scene.expect(Scene.selector(".gg-panel-body")).toBeAbsent(),
      Scene.expect(Scene.selector(".gg-panel p")).toExist(),
      Scene.expect(Scene.selector(".gg-panel-foot")).toBeAbsent(),
      Scene.expect(Scene.selector(".gg-panel-acts")).toBeAbsent(),
      Scene.expect(Scene.selector(".gg-panel-lead")).toBeAbsent(),
      Scene.expect(Scene.selector(".gg-panel-shelf")).toBeAbsent()
    );
  });
});
