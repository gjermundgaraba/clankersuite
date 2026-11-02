import { AsyncData } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";

import * as Button from "../button/button.ts";
import * as Loading from "../loading/loading.ts";
import * as Notice from "../notice/notice.ts";

/** Configuration for rendering data that loads with `view`. */
export type ViewConfig<Data, Error, Message> = Readonly<{
  /** The loading line's id, unique in the document. Retry takes its button away with the
   *  notice, so return `Focus.Focus({ id })` with the retry: focus lands on the line, which
   *  says a first load and stays quiet over a refresh. */
  id: string;
  data: AsyncData.AsyncData<Data, Error>;
  /** What loads, as a noun in the words around it: `"usage"` reads "loading usage", "Usage
   *  not loaded" and "Usage not refreshed". */
  label: string;
  /** Why a load failed, in a sentence, under the notice's title. */
  toErrorText: (error: Error) => string;
  /** Loads it again: the notice's retry button, on a failure and on stale data alike. */
  onRetry: Message;
  /** The data, loaded or the last loaded (an EmptyState for none is the caller's). */
  toDataView: (data: Data) => readonly Html[];
}>;

const capitalised = (label: string): string =>
  `${label.charAt(0).toUpperCase()}${label.slice(1)}`;

/**
 * Data that loads, in each of Foldkit's `AsyncData` states, with the retry built in: a Loading
 * line while it first loads (in place in every state, so its status is heard), an error
 * Notice with retry when it failed with nothing to show, a warn Notice with retry above the
 * last data when a refresh failed (stale), and the data itself once loaded or while it
 * refreshes, quietly, so a page that polls is not heard each time. Spread it where the
 * content goes.
 */
export const view = <Data, Error, Message>(
  config: ViewConfig<Data, Error, Message>,
  h: HtmlBuilder<Message>
): readonly Html[] => {
  const { id, data, label, toErrorText, onRetry, toDataView } = config;

  const noticeView = (
    tone: "Error" | "Warn",
    title: string,
    error: Error
  ): Html =>
    Notice.view(
      {
        tone,
        title,
        body: [toErrorText(error)],
        actions: [
          Button.view({ label: "retry", isSmall: true, onClick: onRetry }, h),
        ],
      },
      h
    );

  return [
    Loading.view(
      {
        isLoading: AsyncData.isLoading(data),
        label: `loading ${label}`,
        attributes: [h.Id(id), h.Tabindex(-1)],
      },
      h
    ),
    ...AsyncData.match(data, {
      onIdle: () => [],
      onLoading: () => [],
      onFailure: (error) => [
        noticeView("Error", `${capitalised(label)} not loaded`, error),
      ],
      onStale: ({ error, data: lastData }) => [
        noticeView("Warn", `${capitalised(label)} not refreshed`, error),
        ...toDataView(lastData),
      ],
      onRefreshing: toDataView,
      onSuccess: toDataView,
    }),
  ];
};
