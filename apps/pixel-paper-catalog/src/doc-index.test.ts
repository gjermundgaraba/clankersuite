import { Effect, Stream } from "effect";
import { describe, expect, it } from "vite-plus/test";

import * as DocIndex from "./doc-index.ts";

const { readingPosition } = DocIndex.subscriptionsFor<
  boolean,
  DocIndex.Message
>({
  isActive: (isShown) => isShown,
  page: () => "components",
  toMessage: (message) => message,
});

const renderSections = (scrollPaddingTop: string): void => {
  document.documentElement.style.scrollPaddingTop = scrollPaddingTop;
  document.body.innerHTML = `
    <div class="spec-stack">
      <section class="spec-section" id="first"></section>
      <section class="spec-section" id="last"></section>
    </div>`;
};

const firstReport = async (): Promise<readonly DocIndex.Message[]> =>
  await Effect.runPromise(
    readingPosition
      .dependenciesToStream(readingPosition.modelToDependencies(true))
      .pipe(Stream.take(1), Stream.runCollect)
  );

describe("DocIndex reading position", () => {
  it("reports the last section whose top has passed the line under the scroll padding", async () => {
    renderSections("40px");

    await expect(firstReport()).resolves.toStrictEqual([
      DocIndex.Message.UpdatedReadingPosition({ id: "last" }),
    ]);
  });

  it("reports the first section when the scroll padding is not in pixels", async () => {
    renderSections("auto");

    await expect(firstReport()).resolves.toStrictEqual([
      DocIndex.Message.UpdatedReadingPosition({ id: "first" }),
    ]);
  });
});
