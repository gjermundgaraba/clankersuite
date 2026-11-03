import { Schema } from "effect";

/** The directives a page may use: `::Example{name="busy"}` mounts the program in the
 *  component's `examples/busy.ts` and prints its source. */
export const islandAttributes = {
  Example: Schema.Struct({ name: Schema.String }),
};
