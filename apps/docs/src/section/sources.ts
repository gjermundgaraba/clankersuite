import { Option, Record } from "effect";

const SOURCES = import.meta.glob<string>(
  ["../example/*.ts", "!../example/*.test.ts"],
  {
    eager: true,
    query: "?raw",
    import: "default",
  }
);

export const sourceOf = (file: string): string =>
  Option.getOrThrowWith(
    Record.get(SOURCES, `../example/${file}`),
    () => new Error(`site/src/example/${file} is missing`)
  );
