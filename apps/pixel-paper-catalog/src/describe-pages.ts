import { Effect } from "effect";
import { Server } from "foldkit/experimental";
import { Window } from "happy-dom";
import { describe, expect, it } from "vite-plus/test";

import { SHOWN_SELECTOR } from "./shown.ts";

export type PagesConfig<Model, Message> = Pick<
  Server.RoutingApplicationConfig<Model, Message>,
  "init" | "view"
> &
  Readonly<{
    paths: readonly string[];
  }>;

const ORIGIN = "https://example.com";

const ID = /<[a-z][^>]*\sid="(?<id>[^"]*)"/gu;

const { DOMParser } = new Window();

const ownHeadings = (html: string): number =>
  [
    ...new DOMParser()
      .parseFromString(html, "text/html")
      .querySelectorAll("h1"),
  ].filter((heading) => heading.closest(SHOWN_SELECTOR) === null).length;

const repeated = (values: readonly string[]): readonly string[] =>
  values.filter((value, index) => values.indexOf(value) !== index);

export const describePages = <Model, Message>(
  config: PagesConfig<Model, Message>
): void => {
  const { init, view, paths } = config;

  const render = (path: string): Server.RenderedApplication =>
    Effect.runSync(
      Server.renderToString(
        { routing: {}, init, view },
        { url: `${ORIGIN}${path}`, isHydratable: false }
      )
    );

  describe("the pre-rendered pages", () => {
    it.each(paths)(
      "%s renders on the server with one h1 of its own, unique ids and a title",
      (path) => {
        const { html, title } = render(path);
        expect(ownHeadings(html)).toBe(1);
        expect(
          repeated(
            Array.from(html.matchAll(ID), (match) => match.groups?.["id"] ?? "")
          )
        ).toStrictEqual([]);
        expect(title.trim()).not.toBe("");
      }
    );

    it("gives every page a title of its own", () => {
      expect(repeated(paths.map((path) => render(path).title))).toStrictEqual(
        []
      );
    });
  });
};
