import { Schema } from "effect";

export const Category = Schema.Literals([
  "actions",
  "forms",
  "feedback",
  "data",
  "navigation",
  "layout",
  "overlays",
  "text",
]);

export type Category = typeof Category.Type;

/** What a component's page declares above its prose. */
export const Frontmatter = Schema.Struct({ category: Category });

export type Frontmatter = typeof Frontmatter.Type;
