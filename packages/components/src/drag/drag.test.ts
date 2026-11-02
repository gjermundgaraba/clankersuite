import { Effect, Option, Stream } from "effect";
import { describe, expect, it } from "vite-plus/test";

import { keydown } from "../test/events.ts";
import { settleUntil } from "../test/settle.ts";
import { insertionIndex, pointerMessages, takeEscape } from "./drag.ts";

const pressOnPage = (key: string, init: KeyboardEventInit = {}) => {
  document.body.innerHTML = `<button id="grip">grip</button>`;
  const reached: string[] = [];
  const messages: string[] = [];

  const onPage = (event: KeyboardEvent): void => {
    reached.push(event.key);
  };

  const onWindow = (event: Event): void => {
    if (event instanceof KeyboardEvent) {
      messages.push(...Option.toArray(takeEscape(event, "cancel")));
    }
  };

  window.addEventListener("keydown", onWindow, { capture: true });
  document.addEventListener("keydown", onPage);
  const event = keydown(key, init);
  document.querySelector("#grip")?.dispatchEvent(event);
  document.removeEventListener("keydown", onPage);
  window.removeEventListener("keydown", onWindow, { capture: true });
  document.body.innerHTML = "";

  return { event, reached, messages };
};

describe("Escape while an item is held", () => {
  it("takes Escape before the page's own bindings see it", () => {
    const { event, reached, messages } = pressOnPage("Escape");

    expect(event.defaultPrevented).toBe(true);
    expect(reached).toStrictEqual([]);
    expect(messages).toStrictEqual(["cancel"]);
  });

  it("leaves other keys, and an Escape that composes text, to the page", () => {
    const composing = pressOnPage("Escape", { isComposing: true });
    const other = pressOnPage("j");

    expect(composing.event.defaultPrevented).toBe(false);
    expect(composing.reached).toStrictEqual(["Escape"]);
    expect(composing.messages).toStrictEqual([]);
    expect(other.reached).toStrictEqual(["j"]);
    expect(other.messages).toStrictEqual([]);
  });
});

type Rect = Readonly<{
  left: number;
  top: number;
  width: number;
  height: number;
}>;

const containerOf = (
  rects: ReadonlyArray<Readonly<{ id: string; rect: Rect }>>
): HTMLElement => {
  const container = document.createElement("ul");

  for (const { id, rect } of rects) {
    const item = document.createElement("li");
    item.dataset["sortableId"] = id;
    Object.assign(item, {
      getBoundingClientRect: () => ({
        ...rect,
        right: rect.left + rect.width,
        bottom: rect.top + rect.height,
      }),
    });
    container.append(item);
  }

  document.body.append(container);

  return container;
};

const row = (index: number): Rect => ({
  left: 0,
  top: index * 40,
  width: 300,
  height: 40,
});

const tile = (column: number, line: number): Rect => ({
  left: column * 100,
  top: line * 100,
  width: 90,
  height: 90,
});

describe("the pointer's place among the others", () => {
  it("reads a column of rows down, past each row's middle", () => {
    const list = containerOf([
      { id: "a", rect: row(0) },
      { id: "held", rect: row(1) },
      { id: "b", rect: row(2) },
      { id: "c", rect: row(3) },
    ]);

    expect(insertionIndex(list, "held", 280, 10)).toBe(0);
    expect(insertionIndex(list, "held", 10, 30)).toBe(1);
    expect(insertionIndex(list, "held", 10, 95)).toBe(1);
    expect(insertionIndex(list, "held", 10, 110)).toBe(2);
    expect(insertionIndex(list, "held", 10, 400)).toBe(3);
  });

  it("reads a row of tiles across, and the next row down", () => {
    const grid = containerOf([
      { id: "a", rect: tile(0, 0) },
      { id: "b", rect: tile(1, 0) },
      { id: "c", rect: tile(2, 0) },
      { id: "d", rect: tile(0, 1) },
      { id: "held", rect: tile(1, 1) },
    ]);

    expect(insertionIndex(grid, "held", 20, 40)).toBe(0);
    expect(insertionIndex(grid, "held", 160, 40)).toBe(2);
    expect(insertionIndex(grid, "held", 20, 140)).toBe(3);
    expect(insertionIndex(grid, "held", 80, 140)).toBe(4);
  });

  it("reads two tiles side by side across while one of them is held", () => {
    const pair = containerOf([
      { id: "a", rect: tile(0, 0) },
      { id: "held", rect: tile(1, 0) },
    ]);

    expect(insertionIndex(pair, "held", 30, 80)).toBe(0);
    expect(insertionIndex(pair, "held", 60, 10)).toBe(1);
  });

  it("reads across where the held tile is the only one beside another", () => {
    const wrapped = containerOf([
      { id: "a", rect: tile(0, 0) },
      { id: "held", rect: tile(1, 0) },
      { id: "c", rect: tile(0, 1) },
    ]);

    expect(insertionIndex(wrapped, "held", 70, 20)).toBe(1);
  });

  it("is the start of an empty list", () => {
    expect(
      insertionIndex(
        containerOf([{ id: "held", rect: row(0) }]),
        "held",
        10,
        10
      )
    ).toBe(0);
  });
});

describe("the pressing pointer", () => {
  it("follows the pointer that pressed, and no other", async () => {
    const collected: Array<readonly string[]> = [];

    const messages = pointerMessages(1, {
      moved: (event) => `moved ${event.clientX}`,
      released: (event) => `released ${event.clientX}`,
      cancelled: () => "cancelled",
    });

    void Effect.runPromise(Stream.runCollect(Stream.take(messages, 3))).then(
      (taken) => collected.push(taken)
    );

    await settleUntil(() => {
      document.dispatchEvent(
        new PointerEvent("pointermove", { pointerId: 2, clientX: 9 })
      );
      document.dispatchEvent(
        new PointerEvent("pointermove", { pointerId: 1, clientX: 4 })
      );
      document.dispatchEvent(
        new PointerEvent("pointerup", { pointerId: 1, clientX: 5 })
      );
      document.dispatchEvent(
        new PointerEvent("pointercancel", { pointerId: 1 })
      );

      return collected.length > 0;
    });

    expect(collected).toStrictEqual([["moved 4", "released 5", "cancelled"]]);
  });
});
