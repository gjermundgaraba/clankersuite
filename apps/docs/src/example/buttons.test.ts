import { Story } from "foldkit";
import { describe, expect, it } from "vite-plus/test";

import * as ButtonsExample from "./buttons.ts";

describe("Buttons example", () => {
  it("sends, and is busy until it lands", () => {
    Story.story(
      ButtonsExample.update,
      Story.given(ButtonsExample.init()),
      Story.message(ButtonsExample.Message.ClickedSend()),
      Story.Command.expectExact(ButtonsExample.WaitForSend()),
      Story.model((model) => {
        expect(model.isSending).toBe(true);
      }),
      Story.Command.resolve(
        ButtonsExample.WaitForSend,
        ButtonsExample.Message.CompletedWaitForSend()
      ),
      Story.model((model) => {
        expect(model.isSending).toBe(false);
      })
    );
  });
});
