import * as Markdown from "@foldkit/markdown";
import {
  CodeSurface,
  Deck,
  Places,
  Prose,
  Scheme,
  SkipLink,
  TopBar,
  Wordmark,
} from "@gjermundgaraba/components";
import { Array, Effect, Option, Schema } from "effect";
import type { Runtime } from "foldkit";
import { Command, Update } from "foldkit";
import type { Document, Html, HtmlBuilder } from "foldkit/html";
import { UrlRequest, load, pushUrl } from "foldkit/navigation";
import { modifyFields } from "foldkit/struct";
import { toString as urlToString } from "foldkit/url";

import { MountExample, sourceOf } from "./example.ts";
import { islandAttributes } from "./islands.ts";
import { Message } from "./message.ts";
import type { Model } from "./model.ts";
import { PAGES, findPage } from "./pages.ts";
import type { Page } from "./pages.ts";
import {
  AppRoute,
  componentRouter,
  homeRouter,
  urlToAppRoute,
} from "./route.ts";

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
    }),
    CompletedNavigateInternal: () => ({ model }),
    CompletedLoadExternal: () => ({ model }),
    CompletedMountExample: () => ({ model }),
    GotSchemeSwitchMessage: ({ message: schemeMessage }) =>
      foldSchemeSwitch(model, schemeMessage),
    GotTopBarMessage: () => ({ model }),
  });

const exampleView =
  (slug: string, h: HtmlBuilder<Message>) =>
  ({ name }: Readonly<{ name: string }>): Html =>
    h.figure(
      [h.Class("site-example")],
      [
        h.keyed("div")(`${slug}/${name}`, [
          h.Class("site-example-stage"),
          h.OnMount(MountExample({ slug, name })),
        ]),
        ...Option.match(sourceOf(slug, name), {
          onNone: () => [],
          onSome: (source) => [
            CodeSurface.view(
              { label: `examples/${name}.ts`, body: [source] },
              h
            ),
          ],
        }),
      ]
    );

const componentView = (page: Page, h: HtmlBuilder<Message>): Html =>
  Prose.view(
    {
      body: [
        Markdown.view(page.document, {
          islands: Markdown.islandsFor(islandAttributes, {
            Example: exampleView(page.slug, h),
          }),
        }),
      ],
    },
    h
  );

const homeView = (h: HtmlBuilder<Message>): Html =>
  Prose.view(
    {
      body: [
        h.h1([], [BRAND]),
        h.p(
          [],
          [
            "One set of Foldkit components for the clanker applications, styled by a brand. clankersuite is the first brand.",
          ]
        ),
      ],
    },
    h
  );

const navView = (model: Model, h: HtmlBuilder<Message>): Html =>
  Places.view(
    {
      label: "Components",
      places: Array.map(PAGES, ({ slug, title }) => ({
        id: slug,
        label: title,
        href: componentRouter({ slug }),
        isCurrent:
          model.route._tag === "Component" && model.route.slug === slug,
      })),
    },
    h
  );

const notFoundView = (h: HtmlBuilder<Message>): Html =>
  Prose.view({ body: [h.h1([], ["Not found"])] }, h);

const contentOf = (
  model: Model,
  h: HtmlBuilder<Message>
): Readonly<{ title: string; body: Html }> =>
  AppRoute.match(model.route, {
    Home: () => ({ title: BRAND, body: homeView(h) }),
    Component: ({ slug }) =>
      Option.match(findPage(slug), {
        onNone: () => ({
          title: `Not found · ${BRAND}`,
          body: notFoundView(h),
        }),
        onSome: (page) => ({
          title: `${page.title} · ${BRAND}`,
          body: componentView(page, h),
        }),
      }),
    NotFound: () => ({ title: `Not found · ${BRAND}`, body: notFoundView(h) }),
  });

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
          [
            h.aside([h.Class("site-nav")], [navView(model, h)]),
            Deck.view({ body: [body] }, h),
          ]
        ),
      ]
    ),
  };
};
