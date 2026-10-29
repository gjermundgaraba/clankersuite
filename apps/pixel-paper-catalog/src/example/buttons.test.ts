import { Story } from "foldkit";
import { describe, expect, it } from "vite-plus/test";

import * as ButtonsExample from "./buttons.ts";

describe("Buttons example", () => {
  it("sends, is busy until it lands, is done, and can send another", () => {
    Story.story(
      ButtonsExample.update,
      Story.given(ButtonsExample.init()),
      Story.message(ButtonsExample.Message.ClickedSend()),
      Story.Command.expectExact(ButtonsExample.WaitForSend()),
      Story.model((model) => {
        expect(model.sendState).toBe("Busy");
      }),
      Story.Command.resolve(
        ButtonsExample.WaitForSend,
        ButtonsExample.Message.CompletedWaitForSend()
      ),
      Story.model((model) => {
        expect(model.sendState).toBe("Done");
      }),
      Story.message(ButtonsExample.Message.ClickedSendAnother()),
      Story.model((model) => {
        expect(model.sendState).toBe("Rest");
      })
    );
  });
});
