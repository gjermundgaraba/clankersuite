import type { Html, HtmlBuilder } from "foldkit/html";

export type ViewConfig = Readonly<{
  body: ReadonlyArray<Html | string>;
  isBusy?: boolean;
}>;

export const view = <Message>(
  config: ViewConfig,
  h: HtmlBuilder<Message>
): Html => {
  const { body, isBusy = false } = config;

  return h.fieldset(
    [
      ...(isBusy ? [h.Disabled(true), h.AriaBusy(true)] : []),
      h.Class("gg-stack gg-gap-m"),
    ],
    body
  );
};
