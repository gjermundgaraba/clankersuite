import { Schema } from "effect";

/** The groups of the component navigation, in the order it lists them. */
export const Category = Schema.Literals([
  "actions",
  "forms",
  "status",
  "data",
  "navigation",
  "layout",
  "overlays",
  "text",
  "plumbing",
]);

export type Category = typeof Category.Type;

/** What a page declares above its prose. A component's page names its category; a
 *  package's page may give its place among that package's pages. */
export const Frontmatter = Schema.Struct({
  category: Schema.optionalKey(Category),
  order: Schema.optionalKey(Schema.FiniteFromString),
});

export type Frontmatter = typeof Frontmatter.Type;
