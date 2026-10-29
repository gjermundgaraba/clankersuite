import { Option, Schema, pipe } from "effect";
import { Route } from "foldkit";
import { defineRouteUnion, literal } from "foldkit/route";

import { Slug } from "./screen/slugs.ts";

export const AppRoute = defineRouteUnion({
  Foundations: {},
  Components: {},
  Screen: { screen: Slug },
  NotFound: { path: Schema.String },
});

export type AppRoute = typeof AppRoute.Type;

export const foundationsRouter = pipe(
  Route.root,
  Route.mapTo(AppRoute.Foundations)
);

export const componentsRouter = pipe(
  literal("components"),
  Route.mapTo(AppRoute.Components)
);

const screenRouter = pipe(
  literal("screens"),
  Route.slash(Route.schemaSegment("screen", Slug)),
  Route.mapTo(AppRoute.Screen)
);

const routeParser = Route.oneOf(
  screenRouter,
  componentsRouter,
  foundationsRouter
);

export const urlToAppRoute = Route.parseUrlWithFallback(
  routeParser,
  AppRoute.NotFound
);

export const screenUrl = (screen: Slug): string => screenRouter({ screen });

export const maybeScreenOf = (route: AppRoute): Option.Option<Slug> =>
  route._tag === "Screen" ? Option.some(route.screen) : Option.none();
