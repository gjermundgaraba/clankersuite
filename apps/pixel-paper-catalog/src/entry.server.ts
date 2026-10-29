import { schemeScript } from "@gjermundgaraba/pixel-paper/scheme";
import { Effect } from "effect";
import { Server } from "foldkit/experimental";

import { PATHS, init, view } from "./main.ts";

const HEAD = [
  '<link rel="icon" type="image/svg+xml" href="/favicon.svg">',
  `<script>${schemeScript}</script>`,
].join("");

export const renderDocument: Server.DocumentRenderer = (application, assets) =>
  Server.renderDocument(application, assets, { head: HEAD });

export const prerenderPaths: readonly string[] = [...PATHS, "/404"];

export const renderPage = async (
  request: Request
): Promise<Server.EntryResult> =>
  await Effect.runPromise(
    Server.renderToString(
      { routing: {}, init, view },
      { url: request.url }
    ).pipe(Effect.map(Server.Rendered))
  );
