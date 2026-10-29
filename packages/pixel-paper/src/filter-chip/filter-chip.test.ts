import { Scene } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { describe, it } from "vite-plus/test";

import * as FilterChip from "./filter-chip.ts";

const Message = defineMessageUnion({ ToggledOpenOnly: {}, ClickedReset: {} });

type Message = typeof Message.Type;

const update = (isOpenOnly: boolean, message: Message) =>
  Message.match<{ model: boolean }>(message, {
    ToggledOpenOnly: () => ({ model: !isOpenOnly }),
    ClickedReset: () => ({ model: false }),
  });

const chipsView = (isOpenOnly: boolean, h: HtmlBuilder<Message>) =>
  h.div(
    [],
    [
      FilterChip.view(
        {
          name: "status",
          label: "open",
          isPressed: isOpenOnly,
          onToggle: Message.ToggledOpenOnly(),
        },
        h
      ),
      FilterChip.view({ name: "owner", label: "me", isPressed: true }, h),
      FilterChip.view(
        { label: "reset", isReset: true, onToggle: Message.ClickedReset() },
        h
      ),
    ]
  );

const fullChipsView = (_isOpenOnly: boolean, h: HtmlBuilder<Message>) =>
  h.div(
    [],
    [
      FilterChip.view(
        {
          name: "scope",
          label: "Operations ×",
          full: "Clear scope: Operations",
          isReset: true,
          onToggle: Message.ClickedReset(),
        },
        h
      ),
      FilterChip.view(
        { name: "owner", label: "me", full: "Owned by me", isPressed: true },
        h
      ),
    ]
  );

const openChip = Scene.role("button", { name: "status open" });
const reset = Scene.role("button", { name: "reset" });
const clearScope = Scene.role("button", { name: "Clear scope: Operations" });

describe("FilterChip", () => {
  it("is a toggle button that says whether its filter is in force", () => {
    Scene.scene(
      { update, view: chipsView },
      Scene.given(false),
      Scene.expect(openChip).toHaveClass("fchip"),
      Scene.expect(openChip).toHaveAttr("aria-pressed", "false"),
      Scene.click(openChip),
      Scene.expect(openChip).toHaveAttr("aria-pressed", "true")
    );
  });

  it("is a pinned label without onToggle, and a plain button to reset", () => {
    Scene.scene(
      { update, view: chipsView },
      Scene.given(true),
      Scene.expect(Scene.selector("span.fchip")).toHaveClass("pinned"),
      Scene.expect(Scene.selector("span.fchip")).toHaveText("owner me"),
      Scene.expect(reset).toHaveClass("reset"),
      Scene.expect(reset).not.toHaveAttr("aria-pressed"),
      Scene.click(reset),
      Scene.expect(openChip).toHaveAttr("aria-pressed", "false")
    );
  });

  it("is named in full when its words alone do not say it, the full words its tip", () => {
    Scene.scene(
      { update, view: fullChipsView },
      Scene.given(true),
      Scene.expect(clearScope).toHaveClass("reset"),
      Scene.expect(clearScope).toHaveText("scope Operations ×"),
      Scene.expect(clearScope).toHaveAttr(
        "data-tip",
        "Clear scope: Operations"
      ),
      Scene.expect(Scene.selector("span.fchip")).toHaveAttr(
        "data-tip",
        "Owned by me"
      ),
      Scene.expect(Scene.selector("span.fchip .sr-only")).toHaveText(
        "Owned by me"
      ),
      Scene.expect(Scene.selector("span.fchip .fchip-name")).toHaveAttr(
        "aria-hidden",
        "true"
      ),
      Scene.expect(
        Scene.selector("span.fchip [aria-hidden]:not(.fchip-name)")
      ).toHaveText("me")
    );
  });
});
