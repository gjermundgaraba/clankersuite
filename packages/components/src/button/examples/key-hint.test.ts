import { Array } from "effect";
import { Scene, Story } from "foldkit";
import { describe, expect, it } from "vite-plus/test";

import { DetectKeyPlatform, Message, init, update, view } from "./key-hint.ts";

describe("the key-hint button example", () => {
  it("asks for the reader's key platform when it starts", () => {
    expect(Array.map(init().commands ?? [], ({ name }) => name)).toStrictEqual([
      DetectKeyPlatform.name,
    ]);
  });

  it("keeps the platform it detected", () => {
    Story.story(
      update,
      Story.given(init().model),
      Story.message(Message.CompletedDetectKeyPlatform({ platform: "Apple" })),
      Story.model((model) => {
        expect(model.platform).toBe("Apple");
      })
    );
  });

  it("prints the button's hint in the platform's words", () => {
    Scene.scene(
      { update, view },
      Scene.given(init().model),
      Scene.expect(Scene.role("button", { name: "find" })).toContainText(
        "Ctrl+K"
      )
    );
    Scene.scene(
      { update, view },
      Scene.given({ platform: "Apple" as const }),
      Scene.expect(Scene.role("button", { name: "find" })).toContainText("⌘K")
    );
  });
});
