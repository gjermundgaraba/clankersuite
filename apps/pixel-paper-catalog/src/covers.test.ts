import * as PixelPaper from "@gjermundgaraba/pixel-paper";
import { Array, Record } from "effect";
import { describe, expect, it } from "vite-plus/test";

import { COMPONENTS, FOUNDATIONS, exportsShown } from "./covers.ts";

const shown = Array.map(
  [...exportsShown(FOUNDATIONS), ...exportsShown(COMPONENTS)],
  ({ name }) => name
);

const isShown = (namespace: string): boolean =>
  Array.some(
    shown,
    (name) => name === namespace || name.startsWith(`${namespace}.`)
  );

describe("covers", () => {
  it("shows every namespace src/index.ts exports in some section", () => {
    expect(
      Array.filter(Record.keys(PixelPaper), (namespace) => !isShown(namespace))
    ).toStrictEqual([]);
  });
});
