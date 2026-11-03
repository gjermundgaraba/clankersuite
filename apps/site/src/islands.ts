import { Schema } from "effect";

/** The directives a page may use: `::Example{name="busy"}` mounts the program in the
 *  component's `examples/busy.ts` and prints its source; `::Tokens{prefix="--semantic-color-text"}`
 *  prints a table of the brand's semantic tokens under that prefix. */
export const islandAttributes = {
  Example: Schema.Struct({ name: Schema.String }),
  Tokens: Schema.Struct({ prefix: Schema.String }),
};
