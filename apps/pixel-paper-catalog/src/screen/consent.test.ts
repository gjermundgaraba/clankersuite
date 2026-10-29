import { Focus } from "@gjermundgaraba/pixel-paper";
import { Option } from "effect";
import { Story } from "foldkit";
import { describe, expect, it } from "vite-plus/test";

import * as ConsentScreen from "./consent.ts";

const resolveFocus = Story.Command.resolve(
  Focus.Focus,
  ConsentScreen.Message.CompletedFocus()
);

describe("Consent screen", () => {
  it("answers, asks again and answers the other way, the keyboard following the controls", () => {
    Story.story(
      ConsentScreen.update,
      Story.given(ConsentScreen.init()),
      Story.message(ConsentScreen.Message.ClickedAllow()),
      Story.Command.expectExact(Focus.Focus({ id: "consent-ask-again" })),
      resolveFocus,
      Story.model((model) => {
        expect(model.maybeAnswer).toStrictEqual(Option.some("Allowed"));
      }),
      Story.message(ConsentScreen.Message.ClickedAskAgain()),
      Story.Command.expectExact(Focus.Focus({ id: "consent-allow" })),
      resolveFocus,
      Story.model((model) => {
        expect(model.maybeAnswer).toStrictEqual(Option.none());
      }),
      Story.message(ConsentScreen.Message.ClickedDeny()),
      Story.Command.expectExact(Focus.Focus({ id: "consent-ask-again" })),
      resolveFocus,
      Story.model((model) => {
        expect(model.maybeAnswer).toStrictEqual(Option.some("Denied"));
      })
    );
  });
});
