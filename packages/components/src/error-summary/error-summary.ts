import { Array } from "effect";
import type { Html, HtmlBuilder } from "foldkit/html";

import { LOCALE } from "../locale/locale.ts";
import * as Notice from "../notice/notice.ts";

/** One field that failed: its control's id and what to do about it. One entry per control:
 *  the summary counts entries as fields and keys each by its `id`, so a caller with several
 *  messages for one control joins them into one entry. */
export type FieldError = Readonly<{
  /** The control's id (a Field's, a Choice's box): the link goes there. */
  id: string;
  /** What is wrong and how to put it right: "Enter the owner name." */
  message: string;
}>;

/** Configuration for rendering an error summary with `view`. */
export type ViewConfig = Readonly<{
  /** Unique in the document: the form's failed submit focuses it by this id. */
  id: string;
  /** The fields that failed, one entry per control, in the order of the form. With none,
   *  nothing renders. */
  errors: readonly FieldError[];
}>;

const headline = (count: number): string =>
  count === 1
    ? "1 field needs attention"
    : `${count.toLocaleString(LOCALE)} fields need attention`;

/**
 * Why a form was not sent, above its fields: the error Notice with a headline that counts the
 * failed fields and a link to each, one entry per control. Render it inside the form when a
 * submit fails, from the errors found at that submit, not live state, and mark the same fields
 * invalid; it holds still while they are put right, until the next submit.
 *
 * It is no live region, since one inserted with its words in it is not reliably read: the
 * form's update, at every failed submit, returns `Focus` with the summary's `id`, which moves
 * focus to it once it has rendered and so reads it, also when it was already showing. A
 * refusal that arrives after the submit (a server that turns a field down while the save is
 * busy) is a failed submit like any other: render the summary from it and focus it.
 *
 * Each link is a fragment link to its field; a Foldkit application's fragment handler moves
 * focus there (`SkipLink.ScrollToFragment`).
 */
export const view = <Message>(
  config: ViewConfig,
  h: HtmlBuilder<Message>
): Html => {
  const { id, errors } = config;

  return Array.match(errors, {
    onEmpty: () => h.empty,
    onNonEmpty: (failed) =>
      h.div(
        [h.Id(id), h.Tabindex(-1), h.Class("notice error error-summary")],
        [
          Notice.toneGlyphView({ tone: "Error" }, h),
          h.div(
            [],
            [
              h.strong([], [headline(failed.length)]),
              h.ul(
                [],
                Array.map(failed, ({ id: fieldId, message }) =>
                  h.keyed("li")(
                    fieldId,
                    [],
                    [h.a([h.Href(`#${fieldId}`)], [message])]
                  )
                )
              ),
            ]
          ),
        ]
      ),
  });
};
