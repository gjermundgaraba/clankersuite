import { Effect, Schema } from "effect";
import type { HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import * as Mount from "foldkit/mount";

import type { Attributes } from "../attributes/attributes.ts";

/** What a bar's height Mount reports: it started keeping the page's custom property at the
 *  bar's height. Nothing in a Model follows it. */
export const Message = defineMessageUnion({ CompletedMeasureHeight: {} });

export type Message = typeof Message.Type;

const isFirstOfKind = (element: Element, selector: string): boolean =>
  document.querySelector(selector) === element;

/** Keeps `property` on the page's root at the bar's height, however it wraps, from the moment
 *  the bar mounts until it leaves, so what is placed around it clears it. Only the page's
 *  first bar of its kind (`selector`) does: one shown inside the page, a specimen of one,
 *  leaves it alone. */
export const MeasureHeight = Mount.define("MeasureHeight", {
  args: { selector: Schema.String, property: Schema.String },
  messages: [Message.CompletedMeasureHeight],
  execute: ({ element, selector, property }) =>
    Effect.gen(function* () {
      if (
        !(element instanceof HTMLElement) ||
        !isFirstOfKind(element, selector)
      ) {
        return Message.CompletedMeasureHeight();
      }

      const root = document.documentElement.style;
      yield* Effect.acquireRelease(
        Effect.sync(() => {
          const measure = (): void => {
            root.setProperty(property, `${element.offsetHeight}px`);
          };

          const observer = new ResizeObserver(measure);
          observer.observe(element);
          measure();

          return observer;
        }),
        (observer) =>
          Effect.sync(() => {
            observer.disconnect();
            root.removeProperty(property);
          })
      );

      return Message.CompletedMeasureHeight();
    }),
});

/** What a parent's Scene resolves the bar's Mount with, the Message lifted as the bar's
 *  `toParentMessage` lifts it: `Scene.Mount.resolveAll(...TopBar.sceneMounts(toParentMessage))`.
 *  It matches by name, since the Mount the parent holds reports the parent's Message. */
export const sceneMounts = <ParentMessage>(
  toParentMessage: (message: Message) => ParentMessage
) =>
  [
    [
      { name: MeasureHeight.name },
      toParentMessage(Message.CompletedMeasureHeight()),
    ],
  ] as const;

export const measureAttributes = <ParentMessage>(
  toParentMessage: (message: Message) => ParentMessage,
  args: Readonly<{ selector: string; property: string }>,
  h: HtmlBuilder<ParentMessage>
): Attributes<ParentMessage> => [
  h.OnMount(Mount.mapMessage(MeasureHeight(args), toParentMessage)),
];
