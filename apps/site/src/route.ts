import { Schema, pipe } from "effect";
import { Route } from "foldkit";
import { defineRouteUnion, literal } from "foldkit/route";

export const AppRoute = defineRouteUnion({
  Home: {},
  Component: { slug: Schema.String },
  NotFound: { path: Schema.String },
});

export type AppRoute = typeof AppRoute.Type;

export const homeRouter = pipe(Route.root, Route.mapTo(AppRoute.Home));

export const componentRouter = pipe(
  literal("components"),
  Route.slash(Route.string("slug")),
  Route.mapTo(AppRoute.Component)
);

export const urlToAppRoute = Route.parseUrlWithFallback(
  Route.oneOf(componentRouter, homeRouter),
  AppRoute.NotFound
);
