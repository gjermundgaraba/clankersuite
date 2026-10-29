import { Focus } from "@gjermundgaraba/pixel-paper";
import { Option } from "effect";
import { Story } from "foldkit";
import { describe, expect, it } from "vite-plus/test";

import * as SetupScreen from "./setup.ts";

const resolveFocus = Story.Command.resolve(
  Focus.Focus,
  SetupScreen.Message.CompletedFocus()
);

const PASSWORD = "a sample password";

describe("Setup screen", () => {
  it("names the first invalid field, one at a time, and puts the keyboard there", () => {
    Story.story(
      SetupScreen.update,
      Story.given(SetupScreen.init()),
      Story.message(SetupScreen.Message.SubmittedSetup()),
      Story.Command.expectExact(Focus.Focus({ id: "su-name" })),
      resolveFocus,
      Story.model((model) => {
        expect(model.maybeInvalid).toStrictEqual(Option.some("Name"));
      }),
      Story.message(SetupScreen.Message.UpdatedName({ value: "sam" })),
      Story.message(
        SetupScreen.Message.UpdatedPassword({ value: "too short" })
      ),
      Story.message(SetupScreen.Message.SubmittedSetup()),
      Story.Command.expectExact(Focus.Focus({ id: "su-pass" })),
      resolveFocus,
      Story.model((model) => {
        expect(model.maybeInvalid).toStrictEqual(Option.some("Password"));
      }),
      Story.message(SetupScreen.Message.UpdatedPassword({ value: PASSWORD })),
      Story.message(
        SetupScreen.Message.UpdatedPasswordAgain({ value: "another password" })
      ),
      Story.message(SetupScreen.Message.SubmittedSetup()),
      Story.Command.expectExact(Focus.Focus({ id: "su-again" })),
      resolveFocus,
      Story.model((model) => {
        expect(model.maybeInvalid).toStrictEqual(Option.some("PasswordAgain"));
        expect(model.isOwnerMade).toBe(false);
      })
    );
  });

  it("makes the owner once the name is there and the two passwords are long enough and alike, and moves the keyboard to the result", () => {
    Story.story(
      SetupScreen.update,
      Story.given(SetupScreen.init()),
      Story.message(SetupScreen.Message.SubmittedSetup()),
      resolveFocus,
      Story.message(SetupScreen.Message.UpdatedName({ value: "sam" })),
      Story.message(SetupScreen.Message.UpdatedPassword({ value: PASSWORD })),
      Story.message(
        SetupScreen.Message.UpdatedPasswordAgain({ value: PASSWORD })
      ),
      Story.message(SetupScreen.Message.SubmittedSetup()),
      Story.Command.expectExact(Focus.Focus({ id: "su-result" })),
      resolveFocus,
      Story.model((model) => {
        expect(model.isOwnerMade).toBe(true);
        expect(model.maybeInvalid).toStrictEqual(Option.none());
      })
    );
  });
});
