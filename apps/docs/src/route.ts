import { Schema, pipe } from "effect";
import { Route } from "foldkit";
import { defineRouteUnion } from "foldkit/route";

export const AppRoute = defineRouteUnion({
  Home: {},
  Page: { section: Schema.String, slug: Schema.String },
  NotFound: { path: Schema.String },
});

export type AppRoute = typeof AppRoute.Type;

export const homeRouter = pipe(Route.root, Route.mapTo(AppRoute.Home));

export const pageRouter = pipe(
  Route.string("section"),
  Route.slash(Route.string("slug")),
  Route.mapTo(AppRoute.Page)
);

export const urlToAppRoute = Route.parseUrlWithFallback(
  Route.oneOf(pageRouter, homeRouter),
  AppRoute.NotFound
);

export const hrefOf = (route: AppRoute): string =>
  AppRoute.match(route, {
    Home: () => homeRouter(),
    Page: ({ section, slug }) => pageRouter({ section, slug }),
    NotFound: ({ path }) => path,
  });
