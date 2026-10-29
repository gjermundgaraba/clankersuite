import { Option } from "effect";
import { AsyncData, Scene } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { describe, it } from "vite-plus/test";

import * as Remote from "./remote.ts";

const Message = defineMessageUnion({ ClickedRetry: {} });

type Message = typeof Message.Type;

type Model = Readonly<{
  data: AsyncData.AsyncData<number, string>;
  retries: number;
}>;

const update = (model: Model, _message: Message) => ({
  model: {
    data: AsyncData.revalidateOrLoad(model.data).pipe(
      Option.getOrElse(() => model.data)
    ),
    retries: model.retries + 1,
  },
});

const view = (model: Model, h: HtmlBuilder<Message>) =>
  h.div(
    [],
    [
      ...Remote.view(
        {
          id: "usage",
          data: model.data,
          label: "usage",
          toErrorText: (error) => `${error}.`,
          onRetry: Message.ClickedRetry(),
          toDataView: (requests) => [
            h.p([h.Class("data")], [`${requests} requests`]),
          ],
        },
        h
      ),
      h.output([h.Class("retries")], [`${model.retries}`]),
    ]
  );

const given = (data: AsyncData.AsyncData<number, string>) =>
  Scene.given<Model>({ data, retries: 0 });

describe("Remote", () => {
  it("says it is loading in the loading line, with nothing else", () => {
    Scene.scene(
      { update, view },
      given(AsyncData.Loading()),
      Scene.expect(Scene.role("status")).toHaveText("loading usage"),
      Scene.expect(Scene.selector(".notice")).toBeAbsent(),
      Scene.expect(Scene.selector(".data")).toBeAbsent()
    );
  });

  it("keeps the loading line in place, empty, once something shows", () => {
    Scene.scene(
      { update, view },
      given(AsyncData.Success({ data: 41_200 })),
      Scene.expect(Scene.role("status")).toHaveClass("loading-idle"),
      Scene.expect(Scene.selector(".data")).toHaveText("41200 requests")
    );
  });

  it("refreshes quietly, over the data it has, with no notice", () => {
    Scene.scene(
      { update, view },
      given(AsyncData.Refreshing({ data: 300 })),
      Scene.expect(Scene.role("status")).toHaveClass("loading-idle"),
      Scene.expect(Scene.selector(".data")).toHaveText("300 requests"),
      Scene.expect(Scene.selector(".notice")).toBeAbsent()
    );
  });

  it("says a failed load as an alert with its reason and a retry", () => {
    Scene.scene(
      { update, view },
      given(AsyncData.Failure({ error: "The server did not answer" })),
      Scene.expect(Scene.role("alert")).toContainText("Usage not loaded"),
      Scene.expect(Scene.role("alert")).toContainText(
        "The server did not answer."
      ),
      Scene.expect(Scene.selector(".data")).toBeAbsent(),
      Scene.click(Scene.role("button", { name: "retry" })),
      Scene.expect(Scene.selector(".retries")).toHaveText("1"),
      Scene.expect(Scene.role("alert")).toBeAbsent(),
      Scene.expect(Scene.selector("#usage")).toHaveText("loading usage")
    );
  });

  it("shows stale data under a warning with its reason and a retry", () => {
    Scene.scene(
      { update, view },
      given(AsyncData.Stale({ error: "The refresh timed out", data: 300 })),
      Scene.expect(Scene.selector(".notice")).toContainText(
        "Usage not refreshed"
      ),
      Scene.expect(Scene.role("alert")).toBeAbsent(),
      Scene.expect(Scene.selector(".data")).toHaveText("300 requests"),
      Scene.click(Scene.role("button", { name: "retry" })),
      Scene.expect(Scene.selector(".retries")).toHaveText("1")
    );
  });
});
