import { describe, expect, it } from "vite-plus/test";

import { keyLabel, keyPlatformOf } from "./key-label.ts";

describe("keyLabel", () => {
  it("prints Mod as the platform's command key", () => {
    expect(keyLabel("Mod+K", "Apple")).toBe("⌘K");
    expect(keyLabel("Mod+K", "Other")).toBe("Ctrl+K");
    expect(keyLabel("Mod+Shift+K", "Apple")).toBe("⇧⌘K");
    expect(keyLabel("Mod+Shift+K", "Other")).toBe("Ctrl+Shift+K");
  });

  it("prints a letter as its keycap, Shift spelled out, and a shifted symbol as typed", () => {
    expect(keyLabel("J", "Other")).toBe("J");
    expect(keyLabel("Shift+G", "Other")).toBe("Shift+G");
    expect(keyLabel("Shift+G", "Apple")).toBe("⇧G");
    expect(keyLabel("Shift+?", "Apple")).toBe("?");
  });

  it("prints arrows as arrows and named keys by name", () => {
    expect(keyLabel("ArrowDown", "Other")).toBe("↓");
    expect(keyLabel("Enter", "Other")).toBe("Enter");
    expect(keyLabel("Enter", "Apple")).toBe("↵");
    expect(keyLabel("Space", "Other")).toBe("Space");
    expect(keyLabel("Alt+ArrowUp", "Apple")).toBe("⌥↑");
  });

  it("prints a sequence's presses a space apart", () => {
    expect(keyLabel(["G", "G"], "Other")).toBe("G G");
    expect(keyLabel(["G", "Shift+G"], "Other")).toBe("G Shift+G");
    expect(keyLabel(["G", "Enter"], "Other")).toBe("G Enter");
  });
});

describe("keyPlatformOf", () => {
  it("reads Apple from a Mac, iPhone or iPad user agent, and Other from anything else", () => {
    expect(
      keyPlatformOf(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15"
      )
    ).toBe("Apple");
    expect(
      keyPlatformOf(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148"
      )
    ).toBe("Apple");
    expect(
      keyPlatformOf(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"
      )
    ).toBe("Other");
    expect(
      keyPlatformOf(
        "Mozilla/5.0 (X11; Linux x86_64; rv:127.0) Gecko/20100101 Firefox/127.0"
      )
    ).toBe("Other");
  });
});
