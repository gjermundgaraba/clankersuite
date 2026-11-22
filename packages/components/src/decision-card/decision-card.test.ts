import { Schema } from "effect";
import { Scene } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { describe, it } from "vite-plus/test";

import * as DecisionCard from "./decision-card.ts";

const Message = defineMessageUnion({ Decided: { where: Schema.String } });

type Message = typeof Message.Type;

const update = (_model: string, message: Message) => ({
  model: message.where,
});

const cardView = (model: string, h: HtmlBuilder<Message>) =>
  DecisionCard.view(
    {
      label: "Book dentist",
      source: { glyph: "user", text: "You, from the phone" },
      title: h.p([], ["Book dentist"]),
      chips: [model],
      decisions: [
        {
          label: "Focus",
          glyph: "star",
          keyHint: { keys: "F", platform: "Other" },
          onDecide: Message.Decided({ where: "Focus" }),
        },
        {
          label: "Someday",
          glyph: "archive",
          onDecide: Message.Decided({ where: "Someday" }),
        },
      ],
    },
    h
  );

const progress = (_model: string, h: HtmlBuilder<Message>) =>
  DecisionCard.progressView(
    { id: "progress", label: "Through the Inbox", position: 2, total: 5 },
    h
  );

describe("DecisionCard", () => {
  it("is an article named by its item, its decisions buttons named by their words", () => {
    Scene.scene(
      { update, view: cardView },
      Scene.given("Undecided"),
      Scene.expect(Scene.role("article", { name: "Book dentist" })).toExist(),
      Scene.expect(Scene.text("You, from the phone")).toExist(),
      Scene.expect(Scene.role("button", { name: "Focus" })).toHaveAttr(
        "type",
        "button"
      ),
      Scene.click(Scene.role("button", { name: "Someday" })),
      Scene.expect(Scene.selector(".gg-decision-chips")).toHaveText("Someday")
    );
  });

  it("says how far through the items the reader is as a named progressbar", () => {
    Scene.scene(
      { update, view: progress },
      Scene.given("Undecided"),
      Scene.expect(
        Scene.role("progressbar", { name: "Through the Inbox" })
      ).toHaveAttr("aria-valuetext", "2 of 5"),
      Scene.expect(
        Scene.role("progressbar", { name: "Through the Inbox" })
      ).toHaveText("2 of 54 left")
    );
  });
});
