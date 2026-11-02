import { Array, Record, pipe } from "effect";
import { Scene } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { describe, expect, it } from "vite-plus/test";

import { view } from "./glyph.ts";
import { artRows, glyphFamilies, glyphs } from "./glyphs.ts";
import type { Cell } from "./glyphs.ts";

const GRID_SIZE = 12;

const everyDrawing = pipe(
  Record.values(glyphFamilies),
  Array.flatMap((family) => Record.toEntries<string, string>(family))
);

const CELLS_BY_NAME = new Map<string, readonly Cell[]>(Object.entries(glyphs));

const inkedKeys = (art: string): readonly string[] =>
  Array.flatMap(artRows(art), (row, y) =>
    Array.filter(
      Array.makeBy(GRID_SIZE, (x) => `${x},${y}`),
      (_key, x) => row.charAt(x) === "#"
    )
  );

const coveredKeys = (cells: readonly Cell[]): readonly string[] =>
  Array.flatMap(cells, ([x, y, width, height]) =>
    Array.flatMap(
      Array.makeBy(height, (row) => y + row),
      (row) => Array.makeBy(width, (column) => `${x + column},${row}`)
    )
  );

describe("glyphs", () => {
  it("draws every glyph as twelve rows of twelve cells", () => {
    const malformed = Array.filter(everyDrawing, ([, art]) => {
      const rows = artRows(art);

      return (
        Array.length(rows) !== GRID_SIZE ||
        Array.some(rows, (row) => !/^[#.]{12}$/u.test(row))
      );
    });

    expect(Array.map(malformed, ([name]) => name)).toStrictEqual([]);
  });

  it("names each glyph once across every family", () => {
    const names = Array.map(everyDrawing, ([name]) => name);

    expect(Array.length(Array.dedupe(names))).toBe(Array.length(names));
  });

  it("covers exactly the inked cells, without overlap", () => {
    const mismatched = Array.filter(everyDrawing, ([name, art]) => {
      const cells = CELLS_BY_NAME.get(name);

      if (cells === undefined) {
        return true;
      }

      const covered = coveredKeys(cells);
      const inked = inkedKeys(art);

      return (
        Array.length(covered) !== Array.length(inked) ||
        !Array.every(inked, (key) => Array.contains(covered, key))
      );
    });

    expect(Array.map(mismatched, ([name]) => name)).toStrictEqual([]);
  });
});

describe("Glyph.view", () => {
  it("prints decorative, in currentColor, at the drawn size", () => {
    Scene.scene(
      {
        update: (model: null) => ({ model }),
        view: (_model: null, h: HtmlBuilder<never>) =>
          view({ name: "check" }, h),
      },
      Scene.given(null),
      Scene.expect(Scene.selector("svg")).toHaveAttr("aria-hidden", "true"),
      Scene.expect(Scene.selector("svg")).toHaveAttr("width", "12"),
      Scene.expect(Scene.selector("svg")).toHaveClass("px-icon")
    );
    expect(Array.isReadonlyArrayNonEmpty(glyphs.check)).toBe(true);
  });
});
