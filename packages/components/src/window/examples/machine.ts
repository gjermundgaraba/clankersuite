import { Chip, IconButton, Window } from "@gjermundgaraba/components";
import { Schema } from "effect";
import type { Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";

export const Model = Schema.Struct({ isRunning: Schema.Boolean });

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  ToggledRunning: {},
});

export type Message = typeof Message.Type;

export const init = (): Update.Return<Model, Message> => ({
  model: { isRunning: true },
});

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    ToggledRunning: () => ({ model: { isRunning: !model.isRunning } }),
  });

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  Window.view(
    {
      id: "window-machine",
      title: "build machine",
      glyph: "machine",
      status: [
        model.isRunning
          ? Chip.view({ label: "running", tone: "Go" }, h)
          : Chip.view({ label: "starting", isBusy: true }, h),
      ],
      tools: [
        IconButton.view(
          {
            glyph: model.isRunning ? "pause" : "play",
            label: model.isRunning ? "Pause" : "Start",
            onClick: Message.ToggledRunning(),
          },
          h
        ),
      ],
      body: [h.p([], ["2 cpu, 4 GB"])],
    },
    h
  );
