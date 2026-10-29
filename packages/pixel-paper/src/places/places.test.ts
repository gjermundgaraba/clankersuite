import { Schema } from "effect";
import { Scene } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import type * as Update from "foldkit/update";
import { describe, it } from "vite-plus/test";

import * as Places from "./places.ts";

const Area = Schema.Literals(["Inbox", "Later", "Archive"]);

type Area = typeof Area.Type;

const Message = defineMessageUnion({ SelectedArea: { area: Area } });

type Message = typeof Message.Type;

const update = (_model: Area, message: Message) =>
  Message.match<Update.Return<Area, Message>>(message, {
    SelectedArea: ({ area }) => ({ model: area }),
  });

const placesView = (model: Area, h: HtmlBuilder<Message>) =>
  Places.view(
    {
      label: "Areas",
      places: [
        {
          id: "inbox",
          label: "Inbox",
          count: 4,
          isCurrent: model === "Inbox",
          onSelect: Message.SelectedArea({ area: "Inbox" }),
        },
        {
          id: "later",
          label: "Later",
          isCurrent: model === "Later",
          onSelect: Message.SelectedArea({ area: "Later" }),
        },
        {
          id: "archive",
          label: "Archive",
          onSelect: Message.SelectedArea({ area: "Archive" }),
          tools: [h.button([], ["remove"])],
        },
      ],
    },
    h
  );

describe("Places", () => {
  it("is a named navigation whose current place follows the choice", () => {
    Scene.scene(
      { update, view: placesView },
      Scene.given<Area>("Inbox"),
      Scene.expect(Scene.role("navigation", { name: "Areas" })).toHaveClass(
        "places"
      ),
      Scene.expect(Scene.role("button", { name: "Inbox 4" })).toHaveAttr(
        "aria-current",
        "page"
      ),
      Scene.expect(Scene.role("button", { name: "Later" })).not.toHaveAttr(
        "aria-current"
      ),
      Scene.expect(Scene.selector(".place-tools button")).toHaveText("remove"),
      Scene.click(Scene.role("button", { name: "Later" })),
      Scene.expect(Scene.role("button", { name: "Later" })).toHaveAttr(
        "aria-current",
        "page"
      ),
      Scene.expect(Scene.role("button", { name: "Inbox 4" })).not.toHaveAttr(
        "aria-current"
      )
    );
  });

  it("keys each place by its id, so two places that share a name stay apart", () => {
    const twins = (model: Area, h: HtmlBuilder<Message>) =>
      Places.view(
        {
          label: "Areas",
          places: [
            {
              id: "inbox",
              label: "Inbox",
              count: 1,
              isCurrent: model === "Inbox",
              onSelect: Message.SelectedArea({ area: "Inbox" }),
            },
            {
              id: "later",
              label: "Inbox",
              count: 2,
              isCurrent: model === "Later",
              onSelect: Message.SelectedArea({ area: "Later" }),
            },
          ],
        },
        h
      );

    Scene.scene(
      { update, view: twins },
      Scene.given<Area>("Inbox"),
      Scene.click(Scene.role("button", { name: "Inbox 2" })),
      Scene.expect(Scene.role("button", { name: "Inbox 2" })).toHaveAttr(
        "aria-current",
        "page"
      ),
      Scene.expect(Scene.role("button", { name: "Inbox 1" })).not.toHaveAttr(
        "aria-current"
      )
    );
  });

  it("prints a place with an address as a link", () => {
    const links = (_model: Area, h: HtmlBuilder<Message>) =>
      Places.view(
        {
          label: "Areas",
          places: [
            {
              id: "inbox",
              label: "Inbox",
              count: 4,
              isCurrent: true,
              href: "/areas/inbox",
            },
            { id: "later", label: "Later", href: "/areas/later" },
          ],
        },
        h
      );

    Scene.scene(
      { update, view: links },
      Scene.given<Area>("Inbox"),
      Scene.expect(Scene.role("link", { name: "Inbox 4" })).toHaveAttr(
        "aria-current",
        "page"
      ),
      Scene.expect(Scene.role("link", { name: "Inbox 4" })).toHaveAttr(
        "href",
        "/areas/inbox"
      ),
      Scene.expect(Scene.role("link", { name: "Later" })).not.toHaveAttr(
        "aria-current"
      ),
      Scene.expect(Scene.selector(".places button")).not.toExist()
    );
  });
});
