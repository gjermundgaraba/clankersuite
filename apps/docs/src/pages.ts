import * as Markdown from "@foldkit/markdown";
import { Array, Option, Order, Record, Schema, pipe } from "effect";

import { Frontmatter } from "./frontmatter.ts";
import type { Category } from "./frontmatter.ts";

type DocumentModule = Readonly<{ default: unknown; frontmatter: unknown }>;

const COMPONENT_DOCUMENTS = import.meta.glob<DocumentModule>(
  "../../../packages/components/src/*/*.md",
  { eager: true }
);

const PACKAGE_DOCUMENTS = import.meta.glob<DocumentModule>(
  "../../../packages/*/docs/*.md",
  { eager: true }
);

/** Where a page sits: a component's page under Components, in its category; a package's
 *  page under that package. */
export type Placement =
  | Readonly<{ _tag: "Component"; category: Option.Option<Category> }>
  | Readonly<{ _tag: "Package"; packageName: string; order: number }>;

/** A page: its address, the title its first heading gives, the directory its examples sit
 *  under, and its prose. */
export type Page = Readonly<{
  href: string;
  title: string;
  directory: string;
  placement: Placement;
  document: Markdown.MarkdownDocument;
}>;

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
    Option.map(({ content }) => inlineText(content)),
    Option.getOrElse(() => "")
  );

const decodeFrontmatter = Schema.decodeUnknownSync(
  Schema.UndefinedOr(Frontmatter)
);

const segmentsOf = (path: string): readonly string[] => path.split("/");

const componentPage = ([path, module]: readonly [
  string,
  DocumentModule,
]): Page => {
  const document = Markdown.decodeDocument(module.default);
  const segments = segmentsOf(path);
  const slug = segments.at(-2) ?? "";

  return {
    href: `/components/${slug}`,
    title: titleOf(document),
    directory: Array.join(segments.slice(0, -1), "/"),
    placement: {
      _tag: "Component",
      category: Option.fromNullishOr(
        decodeFrontmatter(module.frontmatter)?.category
      ),
    },
    document,
  };
};

const packagePage = ([path, module]: readonly [
  string,
  DocumentModule,
]): Page => {
  const document = Markdown.decodeDocument(module.default);
  const segments = segmentsOf(path);
  const packageName = segments.at(-3) ?? "";
  const slug = (segments.at(-1) ?? "").replace(/\.md$/u, "");

  return {
    href: `/${packageName}/${slug}`,
    title: titleOf(document),
    directory: `./foundations/${packageName}`,
    placement: {
      _tag: "Package",
      packageName,
      order: decodeFrontmatter(module.frontmatter)?.order ?? 0,
    },
    document,
  };
};

const byTitle = Order.mapInput(Order.String, ({ title }: Page) => title);

export const COMPONENT_PAGES: readonly Page[] = Array.sort(
  Array.map(Record.toEntries(COMPONENT_DOCUMENTS), componentPage),
  byTitle
);

const orderOf = ({ placement }: Page): number =>
  placement._tag === "Package" ? placement.order : 0;

export const PACKAGE_PAGES: readonly Page[] = Array.sort(
  Array.map(Record.toEntries(PACKAGE_DOCUMENTS), packagePage),
  Order.combine(Order.mapInput(Order.Number, orderOf), byTitle)
);

export const PAGES: readonly Page[] = [...PACKAGE_PAGES, ...COMPONENT_PAGES];

export const findPage = (href: string): Option.Option<Page> =>
  Array.findFirst(PAGES, (page) => page.href === href);
