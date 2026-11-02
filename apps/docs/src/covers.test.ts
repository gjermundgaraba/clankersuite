import * as Components from "@gjermundgaraba/components";
import * as Icons from "@gjermundgaraba/icons";
import { Array, Record, String } from "effect";
import { describe, expect, it } from "vite-plus/test";

import { COMPONENTS, FOUNDATIONS, exportsShown } from "./covers.ts";

const exported = Record.keys({ ...Components, ...Icons });

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
  it("shows every namespace the packages export in some section", () => {
    expect(
      Array.filter(exported, (namespace) => !isShown(namespace))
    ).toStrictEqual([]);
  });

  it("names only namespaces the packages export", () => {
    expect(
      Array.filter(
        shown,
        (name) =>
          !Array.contains(exported, Array.headNonEmpty(String.split(name, ".")))
      )
    ).toStrictEqual([]);
  });
});
