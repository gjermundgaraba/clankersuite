import * as Markdown from "@foldkit/markdown";
import { Array, Option, Order, Record, Schema, pipe } from "effect";

import { Frontmatter } from "./frontmatter.ts";
import type { Category } from "./frontmatter.ts";

type DocumentModule = Readonly<{ default: unknown; frontmatter: unknown }>;

const DOCUMENTS = import.meta.glob<DocumentModule>(
  "../../../packages/components/src/*/*.md",
  { eager: true }
);

/** A component's page: its directory under `packages/components/src`, the title its
 *  first heading gives, and its prose. */
export type Page = Readonly<{
  slug: string;
  title: string;
  category: Category;
  document: Markdown.MarkdownDocument;
}>;

const slugOf = (path: string): string => path.split("/").at(-2) ?? path;

const titleOf = (document: Markdown.MarkdownDocument): string =>
  pipe(
    document.blocks,
    Array.findFirst(
      (block): block is Markdown.Heading =>
        block._tag === "Heading" && block.level === 1
    ),
    Option.map(({ content }) =>
      Array.join(
        Array.map(content, (inline) =>
          inline._tag === "Text" || inline._tag === "InlineCode"
            ? inline.value
            : ""
        ),
        ""
      )
    ),
    Option.getOrElse(() => "")
  );

const pageOf = ([path, module]: readonly [string, DocumentModule]): Page => {
  const document = Markdown.decodeDocument(module.default);

  return {
    slug: slugOf(path),
    title: titleOf(document),
    category: Schema.decodeUnknownSync(Frontmatter)(module.frontmatter)
      .category,
    document,
  };
};

export const PAGES: readonly Page[] = Array.sort(
  Array.map(Record.toEntries(DOCUMENTS), pageOf),
  Order.mapInput(Order.String, ({ title }: Page) => title)
);

export const findPage = (slug: string): Option.Option<Page> =>
  Array.findFirst(PAGES, (page) => page.slug === slug);
