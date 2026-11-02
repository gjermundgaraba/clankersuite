import { Schema } from "effect";
import { Scene } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { describe, it } from "vite-plus/test";

import * as Disclosure from "./disclosure.ts";

const Message = defineMessageUnion({
  ToggledGrants: { isOpen: Schema.Boolean },
});

type Message = typeof Message.Type;

const update = (_model: boolean, message: Message) =>
  Message.match<{ model: boolean }>(message, {
    ToggledGrants: ({ isOpen }) => ({ model: isOpen }),
  });

const disclosureView = (isOpen: boolean, h: HtmlBuilder<Message>) =>
  Disclosure.view(
    {
      id: "grants",
      label: "edit grants",
      isOpen,
      onToggle: (nextOpen) => Message.ToggledGrants({ isOpen: nextOpen }),
      body: [h.p([], ["Three people can edit."])],
    },
    h
  );

const line = Scene.role("button", { name: "edit grants" });

describe("Disclosure", () => {
  it("is a collapsed button whose body stays on the page, hidden", () => {
    Scene.scene(
      { update, view: disclosureView },
      Scene.given(false),
      Scene.expect(line).toHaveAttr("aria-expanded", "false"),
      Scene.expect(line).toHaveClass("disclosure-summary"),
      Scene.expect(Scene.selector(".disclosure-body")).not.toBeVisible(),
      Scene.expect(Scene.selector(".disclosure-body")).toHaveText(
        "Three people can edit."
      )
    );
  });

  it("opens on a press and on Enter, and closes on Space", () => {
    Scene.scene(
      { update, view: disclosureView },
      Scene.given(false),
      Scene.click(line),
      Scene.expect(line).toHaveAttr("aria-expanded", "true"),
      Scene.expect(line).toHaveAttr("aria-controls", "grants-panel"),
      Scene.expect(Scene.selector(".disclosure-body")).toBeVisible(),
      Scene.keydown(line, " "),
      Scene.expect(line).toHaveAttr("aria-expanded", "false"),
      Scene.keydown(line, "Enter"),
      Scene.expect(line).toHaveAttr("aria-expanded", "true")
    );
  });
});
