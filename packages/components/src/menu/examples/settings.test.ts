import { Menu } from "@gjermundgaraba/components";
import { Option } from "effect";
import { Story } from "foldkit";
import { describe, expect, it } from "vite-plus/test";

import { Message, init, update } from "./settings.ts";

const resolveFocus = Story.Command.resolve(
  Menu.Focus,
  Menu.Message.CompletedFocus()
);

const selected = (message: Menu.Message) =>
  Message.GotSettingsMessage({ message });

describe("the settings menu example", () => {
  it("sets the palette from the radio rows, and notes any other row", () => {
    Story.story(
      update,
      Story.given(init().model),
      Story.message(
        selected(Menu.Message.SelectedItem({ id: "Plum", kind: "Radio" }))
      ),
      resolveFocus,
      Story.model((model) => {
        expect(model.palette).toBe("Plum");
        expect(model.maybeLastAction).toStrictEqual(Option.none());
      }),
      Story.message(
        selected(Menu.Message.SelectedItem({ id: "sign-out", kind: "Link" }))
      ),
      resolveFocus,
      Story.model((model) => {
        expect(model.palette).toBe("Plum");
        expect(model.maybeLastAction).toStrictEqual(Option.some("sign-out"));
      })
    );
  });

  it("turns dense rows on and off from the check row", () => {
    const toggleDense = selected(
      Menu.Message.SelectedItem({ id: "dense", kind: "Check" })
    );

    Story.story(
      update,
      Story.given(init().model),
      Story.message(toggleDense),
      Story.model((model) => {
        expect(model.isDense).toBe(true);
      }),
      Story.message(toggleDense),
      Story.model((model) => {
        expect(model.isDense).toBe(false);
      })
    );
  });
});
