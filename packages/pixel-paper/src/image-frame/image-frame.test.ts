import { Effect, Fiber, Schema, Stream } from "effect";
import { Scene } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import * as Mount from "foldkit/mount";
import { modifyFields } from "foldkit/struct";
import type * as Update from "foldkit/update";
import { describe, expect, it } from "vite-plus/test";

import { FrameSize } from "../media/media.ts";
import { settle, settleUntil } from "../test/settle.ts";
import * as ImageFrame from "./image-frame.ts";

const Model = Schema.Struct({ isBroken: Schema.Boolean });

type Model = typeof Model.Type;

const Message = defineMessageUnion({ FailedLoadPicture: {}, ClickedRetry: {} });

type Message = typeof Message.Type;

const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    FailedLoadPicture: () => ({
      model: modifyFields(model, { isBroken: () => true }),
    }),
    ClickedRetry: () => ({
      model: modifyFields(model, { isBroken: () => false }),
    }),
  });

const view = (model: Model, h: HtmlBuilder<Message>) =>
  ImageFrame.view(
    {
      src: "/hills.png",
      alt: "Hills under a white sun",
      size: FrameSize.Pixels({ width: 360, height: 240 }),
      caption: ["Hills, drawn cell by cell."],
      held: model.isBroken ? "Broken" : undefined,
      onBroken: Message.FailedLoadPicture(),
      onRetry: Message.ClickedRetry(),
    },
    h
  );

const detectBroken = ImageFrame.DetectBrokenImage();

describe("ImageFrame", () => {
  it("keeps the picture's space and names the picture", () => {
    Scene.scene(
      {
        update,
        view: (_model: Model, h: HtmlBuilder<Message>) =>
          ImageFrame.view(
            {
              src: "/hills.png",
              alt: "Hills under a white sun",
              size: FrameSize.Pixels({ width: 360, height: 240 }),
              caption: ["Hills, drawn cell by cell."],
              isEager: true,
            },
            h
          ),
      },
      Scene.given({ isBroken: false }),
      Scene.expect(
        Scene.role("img", { name: "Hills under a white sun" })
      ).toHaveAttr("loading", "eager"),
      Scene.expect(Scene.role("img")).toHaveAttr("width", "360"),
      Scene.expect(Scene.role("figure")).toHaveStyle("--ratio", "360 / 240"),
      Scene.expect(Scene.selector("figcaption")).toHaveText(
        "Hills, drawn cell by cell."
      ),
      Scene.expect(Scene.selector(".image-wait")).toHaveAttr(
        "aria-hidden",
        "true"
      )
    );
  });

  it("holds the picture waiting, a modifier of its own rather than the loading line's class", () => {
    Scene.scene(
      {
        update: (model: null) => ({ model }),
        view: (_model: null, h: HtmlBuilder<never>) =>
          ImageFrame.view(
            {
              src: "/hills.png",
              alt: "Hills under a white sun",
              size: FrameSize.Pixels({ width: 360, height: 240 }),
              held: "Loading",
            },
            h
          ),
      },
      Scene.given(null),
      Scene.expect(Scene.role("figure")).toHaveClass("waiting"),
      Scene.expect(Scene.role("figure")).not.toHaveClass("loading")
    );
  });

  it("turns broken when the picture fails, says so in an alert, and retries", () => {
    Scene.scene(
      { update, view },
      Scene.given({ isBroken: false }),
      Scene.Mount.resolve(detectBroken, Message.FailedLoadPicture()),
      Scene.expect(Scene.role("figure")).toHaveClass("broken"),
      Scene.expect(Scene.role("alert")).toContainText(
        "Hills under a white sun"
      ),
      Scene.expect(
        Scene.role("img", { name: "Hills under a white sun" })
      ).toBeAbsent(),
      Scene.Mount.expectEnded(detectBroken),
      Scene.click(Scene.role("button", { name: "retry" })),
      Scene.expect(
        Scene.role("img", { name: "Hills under a white sun" })
      ).toExist(),
      Scene.Mount.resolve(detectBroken, Message.FailedLoadPicture()),
      Scene.Mount.expectEnded(detectBroken),
      Scene.expect(Scene.role("alert")).toExist()
    );
  });
});

const renderImage = (): HTMLImageElement => {
  document.body.innerHTML = `<img alt="" />`;
  const image = document.querySelector("img");

  if (image === null) {
    throw new Error("The fixture has no image.");
  }

  return image;
};

describe("DetectBrokenImage", () => {
  it("reports an error that comes after it mounts", async () => {
    const image = renderImage();

    const fiber = Effect.runFork(
      ImageFrame.DetectBrokenImage()
        .f(image, Mount.liveViewStateChanges)
        .pipe(Stream.take(1), Stream.runCollect)
    );

    await settleUntil(() => {
      image.dispatchEvent(new Event("error"));

      return fiber.pollUnsafe() !== undefined;
    });

    expect([...(await Effect.runPromise(Fiber.join(fiber)))]).toStrictEqual([
      ImageFrame.Message.CompletedDetectBrokenImage(),
    ]);
  });

  it("reports a picture that had already failed before it mounted", async () => {
    const image = renderImage();
    Object.defineProperty(image, "complete", { value: true });
    Object.defineProperty(image, "naturalWidth", { value: 0 });

    const messages = await Effect.runPromise(
      ImageFrame.DetectBrokenImage()
        .f(image, Mount.liveViewStateChanges)
        .pipe(Stream.take(1), Stream.runCollect)
    );

    expect([...messages]).toStrictEqual([
      ImageFrame.Message.CompletedDetectBrokenImage(),
    ]);
  });

  it("stays quiet for a picture that loaded before it mounted", async () => {
    const image = renderImage();
    Object.defineProperty(image, "complete", { value: true });
    Object.defineProperty(image, "naturalWidth", { value: 640 });

    const fiber = Effect.runFork(
      ImageFrame.DetectBrokenImage()
        .f(image, Mount.liveViewStateChanges)
        .pipe(Stream.take(1), Stream.runCollect)
    );

    await settle();
    expect(fiber.pollUnsafe()).toBeUndefined();
    await Effect.runPromise(Fiber.interrupt(fiber));
  });
});
