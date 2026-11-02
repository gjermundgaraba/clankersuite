import { Effect, Option } from "effect";
import { Server } from "foldkit/experimental";
import type { Html, HtmlBuilder } from "foldkit/html";

import { htmlElement } from "../dom/html-element.ts";
import { keydown } from "./events.ts";

export const renderOnPage = async <Model, Message>(
  model: Model,
  view: (model: Model, h: HtmlBuilder<Message>) => Html
): Promise<void> => {
  const rendered = await Effect.runPromise(
    Server.renderToString(
      {
        init: () => ({ model }),
        view: (current: Model, h: HtmlBuilder<Message>) => ({
          title: "Fixture",
          body: view(current, h),
        }),
      },
      { isHydratable: false }
    )
  );

  document.body.innerHTML = rendered.html;
};

export const bySelector = (
  selector: string,
  root: ParentNode = document
): HTMLElement =>
  Option.getOrThrowWith(
    htmlElement(selector, root),
    () => new Error(`The page has no ${selector}.`)
  );

export const elementById = (id: string): Element =>
  Option.getOrThrowWith(
    Option.fromNullishOr(document.querySelector(`#${CSS.escape(id)}`)),
    () => new Error(`The fixture has no #${id}.`)
  );

export const byId = (id: string): HTMLElement =>
  Option.getOrThrowWith(
    htmlElement(`#${CSS.escape(id)}`),
    () => new Error(`The fixture has no #${id}.`)
  );

export const pressOn = (
  id: string,
  key: string,
  init: KeyboardEventInit = {}
): KeyboardEvent => {
  const event = keydown(key, init);
  const target = byId(id);
  target.focus();
  target.dispatchEvent(event);

  return event;
};
