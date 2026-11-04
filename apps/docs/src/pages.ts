import * as Markdown from "@foldkit/markdown";
import { Array, Option, Order, Record, Schema, pipe } from "effect";

import { Frontmatter } from "./frontmatter.ts";
import type { Category } from "./frontmatter.ts";
import { pageRouter } from "./route.ts";

type DocumentModule = Readonly<{ default: unknown; frontmatter: unknown }>;

const COMPONENT_DOCUMENTS = import.meta.glob<DocumentModule>(
  "../../../packages/components/src/*/*.md",
  { eager: true }
);

const PACKAGE_DOCUMENTS = import.meta.glob<DocumentModule>(
  "../../../packages/*/docs/*.md",
  { eager: true }
);

/** A page: its address, the title its first heading gives, the directory its examples sit
 *  under, and its prose. */
export type Page = Readonly<{
  href: string;
  title: string;
  directory: string;
  document: Markdown.MarkdownDocument;
}>;

/** A component's page, listed under its category. */
export type ComponentPage = Page &
  Readonly<{ maybeCategory: Option.Option<Category> }>;

/** A package's page, listed under that package in its order. */
export type PackagePage = Page &
  Readonly<{ packageName: string; order: number }>;

const inlineText = (content: readonly Markdown.Inline[]): string =>
  Array.join(
    Array.map(content, (inline) =>
      inline._tag === "Text" || inline._tag === "InlineCode" ? inline.value : ""
    ),
    ""
  );

const titleOf = (document: Markdown.MarkdownDocument): string =>
  pipe(
    document.blocks,
    Array.findFirst(
      (block): block is Markdown.Heading =>
        block._tag === "Heading" && block.level === 1
    ),
    Option.match({
      onNone: () => "",
      onSome: ({ content }) => inlineText(content),
    })
  );

const decodeFrontmatter = Schema.decodeUnknownSync(
  Schema.UndefinedOr(Frontmatter)
);

const segmentsOf = (path: string): readonly string[] => path.split("/");

const componentPage = ([path, module]: readonly [
  string,
  DocumentModule,
]): ComponentPage => {
  const document = Markdown.decodeDocument(module.default);
  const segments = segmentsOf(path);
  const slug = segments.at(-2) ?? "";

  return {
    href: pageRouter({ section: "components", slug }),
    title: titleOf(document),
    directory: Array.join(segments.slice(0, -1), "/"),
    maybeCategory: Option.fromNullishOr(
      decodeFrontmatter(module.frontmatter)?.category
    ),
    document,
  };
};

const packagePage = ([path, module]: readonly [
  string,
  DocumentModule,
]): PackagePage => {
  const document = Markdown.decodeDocument(module.default);
  const segments = segmentsOf(path);
  const packageName = segments.at(-3) ?? "";
  const slug = (segments.at(-1) ?? "").replace(/\.md$/u, "");

  return {
    href: pageRouter({ section: packageName, slug }),
    title: titleOf(document),
    directory: `./foundations/${packageName}`,
    packageName,
    order: decodeFrontmatter(module.frontmatter)?.order ?? 0,
    document,
  };
};

const byTitle = Order.mapInput(Order.String, ({ title }: Page) => title);

export const COMPONENT_PAGES: readonly ComponentPage[] = Array.sort(
  Array.map(Record.toEntries(COMPONENT_DOCUMENTS), componentPage),
  byTitle
);

const byOrder = Order.mapInput(Order.Number, ({ order }: PackagePage) => order);

export const PACKAGE_PAGES: readonly PackagePage[] = Array.sort(
  Array.map(Record.toEntries(PACKAGE_DOCUMENTS), packagePage),
  Order.combine(byOrder, byTitle)
);

export const PAGES: readonly Page[] = [...PACKAGE_PAGES, ...COMPONENT_PAGES];

export const findPage = (href: string): Option.Option<Page> =>
  Array.findFirst(PAGES, (page) => page.href === href);
