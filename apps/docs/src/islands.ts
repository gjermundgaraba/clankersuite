import { Schema } from "effect";

/** The directives a page may use: `::Example{name="busy"}` mounts the program in the
 *  component's `examples/busy.ts` and prints its source; `::Page{name="workspace"}` runs the
 *  program as a whole page of its own, in a frame, for what is fixed to the window;
 *  `::Tokens{prefix="--semantic-color-text"}` prints a table of the semantic tokens under that
 *  prefix. */
export const islandAttributes = {
  Example: Schema.Struct({ name: Schema.String }),
  Page: Schema.Struct({ name: Schema.String }),
  Tokens: Schema.Struct({ prefix: Schema.String }),
};
