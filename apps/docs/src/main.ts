import * as Markdown from "@foldkit/markdown";
import {
  CodeSurface,
  Deck,
  LiveRegion,
  Prose,
  Scheme,
  SkipLink,
  TopBar,
  Wordmark,
} from "@gjermundgaraba/components";
import { Array, Effect, Option, Schema } from "effect";
import type { Runtime } from "foldkit";
import { Command, Update } from "foldkit";
import * as Dom from "foldkit/dom";
import type { Document, Html, HtmlBuilder } from "foldkit/html";
import { UrlRequest, load, pushUrl } from "foldkit/navigation";
import { modifyFields } from "foldkit/struct";
import { toString as urlToString } from "foldkit/url";

import { MountExample, sourceOf } from "./example.ts";
import { Category } from "./frontmatter.ts";
import homeDocument from "./home.md";
import { islandAttributes } from "./islands.ts";
import { Message } from "./message.ts";
import type { Model } from "./model.ts";
import { COMPONENT_PAGES, PACKAGE_PAGES, findPage } from "./pages.ts";
import type { Page } from "./pages.ts";
import { AppRoute, homeRouter, hrefOf, urlToAppRoute } from "./route.ts";
import { tokensView } from "./token-table.ts";

const BRAND = "gjermundgaraba";

const toSchemeSwitchMessage = (message: Scheme.SchemeSwitch.Message): Message =>
  Message.GotSchemeSwitchMessage({ message });

const NavigateInternal = Command.define("NavigateInternal", {
  args: { url: Schema.String },
  messages: [Message.CompletedNavigateInternal],
  execute: ({ url }) =>
    pushUrl(url).pipe(Effect.as(Message.CompletedNavigateInternal())),
});

const LoadExternal = Command.define("LoadExternal", {
  args: { href: Schema.String },
  messages: [Message.CompletedLoadExternal],
  execute: ({ href }) =>
    load(href).pipe(Effect.as(Message.CompletedLoadExternal())),
});

const FocusMain = Command.define("FocusMain", {
  messages: [Message.CompletedFocusMain],
  execute: Dom.focus("#main", {
    preventScroll: true,
    makeFocusable: true,
  }).pipe(Effect.ignore, Effect.as(Message.CompletedFocusMain())),
});

export const init: Runtime.RoutingApplicationInit<Model, Message> = (url) =>
  Update.foldChildInit(Scheme.SchemeSwitch.init(), {
    toParentModel: (schemeSwitch): Model => ({
      route: urlToAppRoute(url),
      schemeSwitch,
    }),
    toParentMessage: toSchemeSwitchMessage,
  });

const foldSchemeSwitch = Update.foldChild({
  update: Scheme.SchemeSwitch.update,
  read: (model: Model) => Option.some(model.schemeSwitch),
  write: (model: Model, schemeSwitch: Scheme.SchemeSwitch.Model): Model =>
    modifyFields(model, { schemeSwitch: () => schemeSwitch }),
  toParentMessage: toSchemeSwitchMessage,
});

type UpdateReturn = Update.Return<Model, Message>;

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    ClickedLink: ({ request }) =>
      UrlRequest.match<UpdateReturn>(request, {
        Internal: ({ url }) => ({
          model,
          commands: [NavigateInternal({ url: urlToString(url) })],
        }),
        External: ({ href }) => ({ model, commands: [LoadExternal({ href })] }),
      }),
    ChangedUrl: ({ url }) => ({
      model: modifyFields(model, { route: () => urlToAppRoute(url) }),
      commands: [
        SkipLink.ScrollToFragment({ maybeFragment: url.hash }),
        ...Option.match(url.hash, {
          onNone: () => [FocusMain()],
          onSome: () => [],
        }),
      ],
    }),
    CompletedScrollToFragment: () => ({ model }),
    CompletedFocusMain: () => ({ model }),
    CompletedNavigateInternal: () => ({ model }),
    CompletedLoadExternal: () => ({ model }),
    CompletedMountExample: () => ({ model }),
    GotSchemeSwitchMessage: ({ message: schemeMessage }) =>
      foldSchemeSwitch(model, schemeMessage),
    GotTopBarMessage: () => ({ model }),
  });

const exampleView =
  (directory: string, h: HtmlBuilder<Message>) =>
  ({ name }: Readonly<{ name: string }>): Html =>
    h.figure(
      [h.Class("site-example")],
      [
        h.keyed("div")(`${directory}/${name}`, [
          h.Class("site-example-stage"),
          h.OnMount(MountExample({ directory, name })),
        ]),
        ...Option.match(sourceOf(directory, name), {
          onNone: () => [],
          onSome: (source) => [
            h.details(
              [h.Class("site-source")],
              [
                h.summary([], ["code"]),
                CodeSurface.view(
                  { label: `examples/${name}.ts`, body: [source] },
                  h
                ),
              ]
            ),
          ],
        }),
      ]
    );

type Segment = Readonly<{ isProse: boolean; blocks: readonly Html[] }>;

const isOwnBlock = (block: Markdown.Block): boolean =>
  block._tag === "Island" || block._tag === "CodeBlock";

const segmentsOf = (
  blocks: readonly Markdown.Block[],
  views: readonly Html[]
): readonly Segment[] => {
  const pairs = Array.zip(blocks, views);

  return Array.isReadonlyArrayNonEmpty(pairs)
    ? Array.map(
        Array.groupWith(
          pairs,
          ([block], [next]) => !isOwnBlock(block) && !isOwnBlock(next)
        ),
        (group) => ({
          isProse: !isOwnBlock(Array.headNonEmpty(group)[0]),
          blocks: Array.map(group, ([, html]) => html),
        })
      )
    : [];
};

const documentView = (
  document: Markdown.MarkdownDocument,
  directory: string,
  h: HtmlBuilder<Message>
): Html =>
  h.article(
    [h.Class("site-page")],
    Array.flatMap(
      segmentsOf(
        document.blocks,
        Markdown.viewBlocks(document, {
          islands: Markdown.islandsFor(islandAttributes, {
            Example: exampleView(directory, h),
            Tokens: tokensView(h),
          }),
          views: {
            CodeBlock: ({ maybeLanguage, value }) =>
              CodeSurface.view(
                {
                  label: Option.getOrElse(maybeLanguage, () => "code"),
                  body: [value],
                },
                h
              ),
          },
        })
      ),
      ({ isProse, blocks }) =>
        isProse ? [Prose.view({ body: blocks }, h)] : blocks
    )
  );

const HOME = Markdown.decodeDocument(homeDocument);

type NavGroup = Readonly<{ heading: string; pages: readonly Page[] }>;

const CATEGORY_HEADINGS: Readonly<Record<Category, string>> = {
  actions: "Actions",
  forms: "Forms",
  status: "Status",
  data: "Data",
  navigation: "Navigation",
  layout: "Layout",
  overlays: "Overlays",
  text: "Text",
  plumbing: "Plumbing",
};

const packageGroups: readonly NavGroup[] = Array.map(
  Array.dedupe(Array.map(PACKAGE_PAGES, ({ packageName }) => packageName)),
  (packageName) => ({
    heading: packageName,
    pages: Array.filter(
      PACKAGE_PAGES,
      (page) => page.packageName === packageName
    ),
  })
);

const categoryGroups: readonly NavGroup[] = Array.map(
  Category.literals,
  (category) => ({
    heading: CATEGORY_HEADINGS[category],
    pages: Array.filter(COMPONENT_PAGES, ({ maybeCategory }) =>
      Option.contains(maybeCategory, category)
    ),
  })
);

const NAV_GROUPS: readonly NavGroup[] = Array.filter(
  [...packageGroups, ...categoryGroups],
  ({ pages }) => Array.isReadonlyArrayNonEmpty(pages)
);

const navView = (currentHref: string, h: HtmlBuilder<Message>): Html =>
  h.nav(
    [h.AriaLabel("Docs"), h.Class("site-nav")],
    Array.map(NAV_GROUPS, ({ heading, pages }) =>
      h.keyed("section")(
        heading,
        [],
        [
          h.h2([], [heading]),
          h.ul(
            [],
            Array.map(pages, ({ href, title }) =>
              h.keyed("li")(
                href,
                [],
                [
                  h.a(
                    [
                      h.Href(href),
                      ...(href === currentHref ? [h.AriaCurrent("page")] : []),
                    ],
                    [title]
                  ),
                ]
              )
            )
          ),
        ]
      )
    )
  );

const notFoundView = (h: HtmlBuilder<Message>): Html =>
  Prose.view({ body: [h.h1([], ["Not found"])] }, h);

const NOT_FOUND_TITLE = `Not found · ${BRAND}`;

const contentOf = (
  model: Model,
  h: HtmlBuilder<Message>
): Readonly<{ title: string; body: Html }> =>
  AppRoute.matchOrElse(
    model.route,
    { Home: () => ({ title: BRAND, body: documentView(HOME, "", h) }) },
    (route) =>
      Option.match(findPage(hrefOf(route)), {
        onNone: () => ({ title: NOT_FOUND_TITLE, body: notFoundView(h) }),
        onSome: (page) => ({
          title: `${page.title} · ${BRAND}`,
          body: documentView(page.document, page.directory, h),
        }),
      })
  );

export const view = (model: Model, h: HtmlBuilder<Message>): Document => {
  const { title, body } = contentOf(model, h);

  return {
    title,
    body: h.div(
      [],
      [
        SkipLink.view(h),
        TopBar.view(
          {
            brand: [Wordmark.view({ label: BRAND, href: homeRouter() }, h)],
            tools: [
              h.submodel({
                slotId: "scheme-switch",
                model: model.schemeSwitch,
                view: Scheme.SchemeSwitch.view,
                toParentMessage: toSchemeSwitchMessage,
              }),
            ],
            toParentMessage: (message) => Message.GotTopBarMessage({ message }),
          },
          h
        ),
        h.div(
          [h.Class("site-layout")],
          [navView(hrefOf(model.route), h), Deck.view({ body: [body] }, h)]
        ),
        ...LiveRegion.place([], () => LiveRegion.view({}, h)).toPageView(),
      ]
    ),
  };
};
