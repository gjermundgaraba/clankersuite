import { Schema } from "effect";

export const Slug = Schema.Literals([
  "queue",
  "document",
  "console",
  "library",
  "stage",
  "workspace",
  "sign-in",
  "setup",
  "consent",
  "session",
  "refused",
  "spaces",
  "not-found",
]);

export type Slug = typeof Slug.Type;
