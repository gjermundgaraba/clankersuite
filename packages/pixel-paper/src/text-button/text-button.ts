import { Button as UiButton } from "@foldkit/ui";
import type { Html, HtmlBuilder } from "foldkit/html";

/** Configuration for rendering a text button with `view`. */
export type ViewConfig<Message> = Readonly<{
  label: string;
  onClick?: Message;
}>;

/** A button that reads as a word in the top bar: pixel caps, a dotted rule on hover. */
export const view = <Message>(
  config: ViewConfig<Message>,
  h: HtmlBuilder<Message>
): Html => {
  const { label, onClick } = config;

  return UiButton.view(
    {
      ...(onClick !== undefined && { onClick }),
      toView: (groups) =>
        h.button([...groups.button, h.Class("textbtn")], [label]),
    },
    h
  );
};
