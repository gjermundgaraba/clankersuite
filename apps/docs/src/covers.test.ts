import * as Components from "@gjermundgaraba/components";
import { Array, Record } from "effect";
import { describe, expect, it } from "vite-plus/test";

import { COMPONENT_PAGES, PAGES } from "./pages.ts";

const kebab = (name: string): string =>
  name.replaceAll(/(?<=[a-z0-9])(?=[A-Z])/gu, "-").toLowerCase();

const exportPages = Array.map(
  Record.keys(Components),
  (name) => `/components/${kebab(name)}`
);

describe("the docs", () => {
  it("give every component its page, and no page to a component that is gone", () => {
    expect(
      Array.map(COMPONENT_PAGES, ({ href }) => href).toSorted()
    ).toStrictEqual(exportPages.toSorted());
  });

  it("show the glyphs", () => {
    expect(Array.some(PAGES, ({ href }) => href === "/icons/glyphs")).toBe(
      true
    );
  });
});
