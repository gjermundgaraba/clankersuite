import { describe, expect, it } from "vite-plus/test";
import { fn } from "../src/index.ts";

describe("fn", () => {
  it("greets Vite+", () => {
    expect(fn()).toBe("Hello, Vite+!");
  });
});
