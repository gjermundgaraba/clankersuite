import { Schema } from "effect";
import { Scene } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import type * as Update from "foldkit/update";
import { describe, it } from "vite-plus/test";

import * as QueryChip from "./query-chip.ts";

const Message = defineMessageUnion({ UpdatedQuery: { value: Schema.String } });

type Message = typeof Message.Type;

const update = (_query: string, message: Message) =>
  Message.match<Update.Return<string, Message>>(message, {
    UpdatedQuery: ({ value }) => ({ model: value }),
  });

const chipView = (query: string, h: HtmlBuilder<Message>) =>
  QueryChip.view(
    {
      id: "find",
      label: "find",
      value: query,
      onInput: (value) => Message.UpdatedQuery({ value }),
      placeholder: "words",
    },
    h
  );

const field = Scene.label("find");

describe("QueryChip", () => {
  it("is a search field named by the chip, tinted while it holds a query", () => {
    Scene.scene(
      { update, view: chipView },
      Scene.given(""),
      Scene.expect(field).toHaveAttr("type", "search"),
      Scene.expect(field).toHaveAttr("placeholder", "words"),
      Scene.expect(Scene.selector("label.fchip.query")).not.toHaveClass("live"),
      Scene.type(field, "sink"),
      Scene.expect(field).toHaveValue("sink"),
      Scene.expect(Scene.selector("label.fchip.query")).toHaveClass("live")
    );
  });
});

describe("QueryChip input attributes", () => {
  it("puts the caller's attributes on the search field, its own id kept", () => {
    Scene.scene(
      {
        update,
        view: (query: string, h: HtmlBuilder<Message>) =>
          QueryChip.view(
            {
              id: "find",
              label: "find",
              value: query,
              onInput: (value) => Message.UpdatedQuery({ value }),
              inputAttributes: [
                h.Id("elsewhere"),
                h.AriaDescribedBy("find-help"),
              ],
            },
            h
          ),
      },
      Scene.given(""),
      Scene.expect(field).toHaveAttr("id", "find"),
      Scene.expect(field).toHaveAttr("aria-describedby", "find-help"),
      Scene.expect(Scene.selector("label.fchip.query")).not.toHaveAttr(
        "aria-describedby"
      )
    );
  });
});
