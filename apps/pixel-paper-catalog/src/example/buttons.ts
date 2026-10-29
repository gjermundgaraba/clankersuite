import type { KeyHint } from "@gjermundgaraba/pixel-paper";
import {
  Button,
  IconButton,
  LinkButton,
  TextButton,
} from "@gjermundgaraba/pixel-paper";
import { Duration, Effect, Schema } from "effect";
import * as Command from "foldkit/command";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";
import { defineView } from "foldkit/submodel";
import type * as Update from "foldkit/update";

import { rowView, specView } from "../spec.ts";

export const Model = Schema.Struct({
  sendState: Schema.Literals(["Rest", "Busy", "Done"]),
});

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  ClickedSend: {},
  CompletedWaitForSend: {},
  ClickedSendAnother: {},
});

export type Message = typeof Message.Type;

export const init = (): Model => ({ sendState: "Rest" });

const SAMPLE_SEND_DURATION = Duration.millis(1600);

export const WaitForSend = Command.define("WaitForSend", {
  messages: [Message.CompletedWaitForSend],
  execute: Effect.sleep(SAMPLE_SEND_DURATION).pipe(
    Effect.as(Message.CompletedWaitForSend())
  ),
});

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    ClickedSend: () => ({
      model: modifyFields(model, { sendState: () => "Busy" }),
      commands: [WaitForSend()],
    }),
    CompletedWaitForSend: () => ({
      model: modifyFields(model, { sendState: () => "Done" }),
    }),
    ClickedSendAnother: () => ({
      model: modifyFields(model, { sendState: () => "Rest" }),
    }),
  });

export type ViewInputs = Readonly<{ platform: KeyHint.KeyPlatform }>;

const busyPair = (
  config: Button.ViewConfig<Message>,
  h: HtmlBuilder<Message>
): Html =>
  h.span(
    [h.Class("spec-stack-start")],
    [Button.view(config, h), Button.view({ ...config, isBusy: true }, h)]
  );

const sendView = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.span(
    [h.Class("spec-inline")],
    [
      Button.view(
        {
          label: "send",
          variant: "Primary",
          glyph: "send",
          onClick: Message.ClickedSend(),
          isBusy: model.sendState === "Busy",
          done: { isDone: model.sendState === "Done", label: "sent" },
        },
        h
      ),
      ...(model.sendState === "Done"
        ? [
            TextButton.view(
              { label: "send another", onClick: Message.ClickedSendAnother() },
              h
            ),
          ]
        : []),
    ]
  );

const variantsView = (h: HtmlBuilder<Message>): Html =>
  rowView(
    [
      specView("default", [Button.view({ label: "keep" }, h)], h),
      specView(
        "primary",
        [Button.view({ label: "save", variant: "Primary" }, h)],
        h
      ),
      specView(
        "with a glyph",
        [Button.view({ label: "add", glyph: "plus" }, h)],
        h
      ),
      specView("small", [Button.view({ label: "copy", isSmall: true }, h)], h),
      specView(
        "the default in a card",
        [
          Button.view(
            { label: "register", variant: "Primary", isDefault: true },
            h
          ),
        ],
        h
      ),
      specView(
        "disabled",
        [Button.view({ label: "publish", isDisabled: true }, h)],
        h
      ),
      specView(
        "danger: inside a confirm only",
        [Button.view({ label: "delete", variant: "Danger" }, h)],
        h
      ),
    ],
    h
  );

const statesView = (
  platform: KeyHint.KeyPlatform,
  h: HtmlBuilder<Message>
): Html =>
  rowView(
    [
      specView(
        "busy keeps the width: at rest, then busy",
        [busyPair({ label: "save", variant: "Primary" }, h)],
        h
      ),
      specView("small", [busyPair({ label: "retry", isSmall: true }, h)], h),
      specView(
        "done: ink, flat, the check in the glyph's place",
        [
          Button.view(
            {
              label: "save",
              glyph: "save",
              isSmall: true,
              done: { isDone: true, label: "saved" },
            },
            h
          ),
        ],
        h
      ),
      specView(
        "with the key that does the same",
        [
          Button.view(
            { label: "find", keyHint: { keys: "Mod+K", platform } },
            h
          ),
        ],
        h
      ),
    ],
    h
  );

const otherButtonsView = (h: HtmlBuilder<Message>): Html =>
  rowView(
    [
      specView(
        "icon button",
        [IconButton.view({ glyph: "cross", label: "Close" }, h)],
        h
      ),
      specView(
        "quiet: row tools",
        [
          h.span(
            [h.Class("spec-inline")],
            [
              IconButton.view(
                { glyph: "plus", label: "Add beside", isQuiet: true },
                h
              ),
              IconButton.view(
                { glyph: "pencil", label: "Rename", isQuiet: true },
                h
              ),
              IconButton.view(
                { glyph: "copy", label: "Copy", isQuiet: true },
                h
              ),
            ]
          ),
        ],
        h
      ),
      specView(
        "text button: top bar words",
        [TextButton.view({ label: "sign out" }, h)],
        h
      ),
      specView(
        "a link printed as a button",
        [
          LinkButton.view(
            { label: "open the docs", href: "#buttons", glyph: "arrow-right" },
            h
          ),
        ],
        h
      ),
    ],
    h
  );

export const view = defineView<Model, Message, ViewInputs>(
  (model, { platform }, h): Html =>
    h.div(
      [h.Class("spec-rows")],
      [
        variantsView(h),
        statesView(platform, h),
        rowView(
          [
            specView(
              "send, then busy, then done: press it",
              [sendView(model, h)],
              h
            ),
          ],
          h
        ),
        otherButtonsView(h),
      ]
    )
);
