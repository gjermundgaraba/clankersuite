import { Focus } from "@gjermundgaraba/pixel-paper";
import { Option } from "effect";
import { Story } from "foldkit";
import { describe, expect, it } from "vite-plus/test";

import * as SignInScreen from "./sign-in.ts";

const resolveFocus = Story.Command.resolve(
  Focus.Focus,
  SignInScreen.Message.CompletedFocus()
);

describe("Sign-in screen", () => {
  it("names the first missing field, one at a time, and puts the keyboard there", () => {
    Story.story(
      SignInScreen.update,
      Story.given(SignInScreen.init()),
      Story.message(SignInScreen.Message.UpdatedName({ value: "  " })),
      Story.message(
        SignInScreen.Message.UpdatedPassword({ value: "a sample password" })
      ),
      Story.message(SignInScreen.Message.SubmittedSignIn()),
      Story.Command.expectExact(Focus.Focus({ id: "si-name" })),
      resolveFocus,
      Story.model((model) => {
        expect(model.maybeMissing).toStrictEqual(Option.some("Name"));
      }),
      Story.message(SignInScreen.Message.UpdatedName({ value: "sam" })),
      Story.message(SignInScreen.Message.UpdatedPassword({ value: "" })),
      Story.message(SignInScreen.Message.SubmittedSignIn()),
      Story.Command.expectExact(Focus.Focus({ id: "si-pass" })),
      resolveFocus,
      Story.model((model) => {
        expect(model.maybeMissing).toStrictEqual(Option.some("Password"));
        expect(model.name).toBe("sam");
      })
    );
  });

  it("signs in with a name and a password, and signs out to the empty form's first field", () => {
    Story.story(
      SignInScreen.update,
      Story.given(SignInScreen.init()),
      Story.message(SignInScreen.Message.SubmittedSignIn()),
      resolveFocus,
      Story.message(SignInScreen.Message.UpdatedName({ value: "sam" })),
      Story.message(
        SignInScreen.Message.UpdatedPassword({ value: "a sample password" })
      ),
      Story.message(SignInScreen.Message.ToggledPasswordShown()),
      Story.message(SignInScreen.Message.SubmittedSignIn()),
      Story.Command.expectExact(Focus.Focus({ id: "si-sign-out" })),
      resolveFocus,
      Story.model((model) => {
        expect(model.isSignedIn).toBe(true);
        expect(model.maybeMissing).toStrictEqual(Option.none());
        expect(model.name).toBe("sam");
        expect(model.password).toBe("");
        expect(model.isPasswordShown).toBe(false);
      }),
      Story.message(SignInScreen.Message.ClickedSignOut()),
      Story.Command.expectExact(Focus.Focus({ id: "si-name" })),
      resolveFocus,
      Story.model((model) => {
        expect(model).toStrictEqual(SignInScreen.init());
      })
    );
  });
});
