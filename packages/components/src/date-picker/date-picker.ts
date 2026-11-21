import { Effect, Option } from "effect";
import type { Scope } from "effect";
import type { Html, HtmlBuilder } from "foldkit/html";
import type * as Mount from "foldkit/mount";

import type { Attributes } from "../attributes/attributes.ts";
import { htmlElementById } from "../dom/html-element.ts";

const OPENER_ATTRIBUTE = "data-gg-picks-day";

const openerOf = (target: EventTarget | null): string | undefined => {
  const opener =
    target instanceof Element ? target.closest(`[${OPENER_ATTRIBUTE}]`) : null;

  return opener?.getAttribute(OPENER_ATTRIBUTE) ?? undefined;
};

/** The work of a date input's Mount: opens the input's native picker when a control carrying
 *  `openerAttributes` with its id is pressed, by mouse or by Enter and Space, inside the
 *  press, which a browser asks of a picker; and once a day is picked, puts focus on the
 *  element `returnFocusId` names. It sits on the input, which outlives an opener that leaves
 *  the page as it is pressed, such as a menu's row. Reports `completed` once bound. */
export const bindPicker =
  <Completed>(completed: Completed) =>
  ({
    element,
    returnFocusId,
  }: Readonly<{ element: Element; returnFocusId: string }>): Effect.Effect<
    Completed,
    never,
    Scope.Scope
  > =>
    Effect.gen(function* () {
      if (!(element instanceof HTMLInputElement)) {
        return completed;
      }

      const open = (event: Event): void => {
        if (openerOf(event.target) === element.id) {
          element.showPicker();
        }
      };

      yield* Effect.acquireRelease(
        Effect.sync(() => {
          const lifetime = new AbortController();
          document.addEventListener("click", open, { signal: lifetime.signal });
          element.addEventListener(
            "change",
            () => {
              Option.map(htmlElementById(returnFocusId), (back) => {
                back.focus();
              });
            },
            { signal: lifetime.signal }
          );

          return lifetime;
        }),
        (lifetime) =>
          Effect.sync(() => {
            lifetime.abort();
          })
      );

      return completed;
    });

/** Makes a control the opener of the date input `inputId`, and says it opens a picker
 *  (`aria-haspopup="dialog"`, the picker being a dialog the browser draws). */
export const openerAttributes = <ParentMessage>(
  inputId: string,
  h: HtmlBuilder<ParentMessage>
): Attributes<ParentMessage> => [
  h.DataAttribute("gg-picks-day", inputId),
  h.AriaHasPopup("dialog"),
];

/** Configuration for the hidden date input with `inputView`. */
export type InputConfig<ParentMessage> = Readonly<{
  /** Unique in the document; its opener carries `openerAttributes` with it. */
  id: string;
  /** The day as `YYYY-MM-DD`, or `""` for none. */
  value: string;
  /** The day picked, as `YYYY-MM-DD`, or `""` once it is cleared. */
  onChange: (value: string) => ParentMessage;
  /** The input's Mount, built on `bindPicker`, whose `returnFocusId` names the element focus
   *  goes back to once a day is picked: the opener, or the toggle of the menu it was in. */
  mount: Mount.MountAction<ParentMessage>;
}>;

/** The hidden date input whose picker an opener opens: out of the keyboard's order and
 *  screen readers' reach, since the opener is the control. Not `inert`, which a browser may
 *  take as refusing the value its own picker sets. */
export const inputView = <ParentMessage>(
  config: InputConfig<ParentMessage>,
  h: HtmlBuilder<ParentMessage>
): Html =>
  h.input([
    h.Id(config.id),
    h.Type("date"),
    h.Value(config.value),
    h.Tabindex(-1),
    h.AriaHidden(true),
    h.Class("sr-only"),
    h.OnChange(config.onChange),
    h.OnMount(config.mount),
  ]);
