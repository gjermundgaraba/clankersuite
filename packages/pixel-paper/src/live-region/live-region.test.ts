import { Scene } from "foldkit";
import { inertHtml } from "foldkit/html";
import type { Html, HtmlBuilder } from "foldkit/html";
import { describe, expect, it } from "vite-plus/test";

import { ANNOUNCER_ATTRIBUTE } from "../announcer/announcer.ts";
import * as LiveRegion from "./live-region.ts";

type Host = "Form" | "Confirm";

const placeIn = (
  isFormOpen: boolean,
  isConfirmOpen: boolean,
  h: HtmlBuilder<never>
) =>
  LiveRegion.place<Host>(
    [
      ["Form", isFormOpen],
      ["Confirm", isConfirmOpen],
    ],
    () => LiveRegion.view({ toasts: h.div([h.Class("toasts")]) }, h)
  );

const pageView =
  (isFormOpen: boolean, isConfirmOpen: boolean) =>
  (_model: null, h: HtmlBuilder<never>): Html => {
    const placement = placeIn(isFormOpen, isConfirmOpen, h);

    const dialogView = (host: Host, isOpen: boolean): readonly Html[] => {
      const toLiveRegionView = placement.toDialogView(host);

      return isOpen
        ? [
            h.dialog(
              [h.Id(host), h.Open(true)],
              toLiveRegionView === undefined ? [] : [toLiveRegionView()]
            ),
          ]
        : [];
    };

    return h.main(
      [h.Id("page")],
      [
        ...dialogView("Form", isFormOpen),
        ...dialogView("Confirm", isConfirmOpen),
        ...placement.toPageView(),
      ]
    );
  };

const region = Scene.selector(`[${ANNOUNCER_ATTRIBUTE}]`);
const regions = Scene.all.selector(`[${ANNOUNCER_ATTRIBUTE}]`);

describe("LiveRegion", () => {
  it("puts the parts at the end of the page while no dialog is open", () => {
    Scene.scene(
      { update: (model: null) => ({ model }), view: pageView(false, false) },
      Scene.given(null),
      Scene.expectAll(regions).toHaveCount(1),
      Scene.expect(Scene.selector("#page .toasts")).toExist(),
      Scene.expect(region).toHaveAttr("aria-live", "polite")
    );
  });

  it("puts them in the topmost open dialog, once, with the toasts beside the region", () => {
    Scene.scene(
      { update: (model: null) => ({ model }), view: pageView(true, true) },
      Scene.given(null),
      Scene.expectAll(regions).toHaveCount(1),
      Scene.expect(Scene.selector("#Confirm .toasts")).toExist(),
      Scene.expect(Scene.selector("#Form .toasts")).toBeAbsent()
    );
  });

  it("hands the parts to an open dialog whose one above is closed", () => {
    Scene.scene(
      { update: (model: null) => ({ model }), view: pageView(true, false) },
      Scene.given(null),
      Scene.expectAll(regions).toHaveCount(1),
      Scene.expect(Scene.selector("#Form .toasts")).toExist()
    );
  });

  it("builds the parts only where they are placed", () => {
    const parts = inertHtml.div([inertHtml.Class("parts")]);
    let built = 0;

    const placement = LiveRegion.place<Host>(
      [
        ["Form", true],
        ["Confirm", false],
      ],
      () => {
        built += 1;

        return parts;
      }
    );

    expect(placement.toPageView()).toStrictEqual([]);
    expect(placement.toDialogView("Confirm")).toBeUndefined();
    expect(built).toBe(0);
    expect(placement.toDialogView("Form")?.()).toBe(parts);
    expect(built).toBe(1);
  });
});
