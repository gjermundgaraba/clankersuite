import { Effect } from "effect";
import { describe, expect, it } from "vite-plus/test";

import { Focus, Message } from "./focus.ts";

describe("Focus", () => {
  it("focuses the element with the id, an id CSS would need escaped too", async () => {
    document.body.innerHTML = `<button id="save">Save</button><button id="task:1/title">Title</button>`;

    const saved = await Effect.runPromise(Focus({ id: "save" }).effect);
    expect(document.activeElement?.id).toBe("save");
    expect(saved).toStrictEqual(Message.CompletedFocus());

    await Effect.runPromise(Focus({ id: "task:1/title" }).effect);
    expect(document.activeElement?.id).toBe("task:1/title");
  });

  it("does nothing and still completes when no element has the id", async () => {
    document.body.innerHTML = `<button id="save">Save</button>`;

    const missed = await Effect.runPromise(Focus({ id: "gone" }).effect);
    expect(missed).toStrictEqual(Message.CompletedFocus());
    expect(document.activeElement).toBe(document.body);
  });
});
