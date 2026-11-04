import { Card, Focus } from "@gjermundgaraba/components";
import { Option } from "effect";
import { Story } from "foldkit";
import { modifyFields } from "foldkit/struct";
import { describe, expect, it } from "vite-plus/test";

import { Message, SendInvite, init, update } from "./form.ts";

describe("the form card example", () => {
  it("holds the form while the invite sends, then says who was invited", () => {
    Story.story(
      update,
      Story.given(init().model),
      Story.message(Message.SubmittedInvite()),
      Story.Command.expectNone(),
      Story.message(Message.UpdatedEmail({ value: " ada@example.com " })),
      Story.message(Message.SubmittedInvite()),
      Story.Command.expectExact(
        Focus.Focus({ id: Card.submitId("invite-form") }),
        SendInvite()
      ),
      Story.Command.resolve(Focus.Focus, Message.CompletedFocus()),
      Story.model((model) => {
        expect(model.isSending).toBe(true);
      }),
      Story.Command.resolve(SendInvite, Message.CompletedSendInvite()),
      Story.model((model) => {
        expect(model.isSending).toBe(false);
        expect(model.email).toBe("");
        expect(model.maybeSentTo).toStrictEqual(Option.some("ada@example.com"));
      })
    );
  });

  it("sends nothing a second time while the invite sends", () => {
    Story.story(
      update,
      Story.given(
        modifyFields(init().model, {
          email: () => "ada@example.com",
          isSending: () => true,
        })
      ),
      Story.message(Message.SubmittedInvite()),
      Story.Command.expectNone()
    );
  });
});
