import { Schema } from "effect";

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

export const Frontmatter = Schema.Struct({
  category: Schema.optionalKey(Category),
  order: Schema.optionalKey(Schema.FiniteFromString),
});

export type Frontmatter = typeof Frontmatter.Type;
