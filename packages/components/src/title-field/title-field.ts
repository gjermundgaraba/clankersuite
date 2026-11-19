import { Option } from "effect";
import type {
  ChildAttribute,
  Html,
  HtmlBuilder,
  TextareaAttribute,
} from "foldkit/html";

/** Configuration for rendering a title field with `view`. */
export type ViewConfig<Message> = Readonly<{
  id: string;
  /** The field's name for screen readers, since the title is its own label: `"Title"`. */
  label: string;
  value: string;
  /** Sent with each edit, its line breaks (from a paste) turned into spaces: a title is one
   *  line. */
  onInput: (value: string) => Message;
  /** Sent on Enter, which never breaks the line: the title is done. */
  onEnter: Message;
  /** Further attributes for the `<textarea>`, such as a Dialog's `initialFocus` group; never
   *  a class. */
  attributes?: ReadonlyArray<TextareaAttribute<Message> | ChildAttribute>;
}>;

/** A title edited where it is printed: a headline in bold that is its own field, so a task's
 *  title is never printed twice, once to read and once to edit. It wraps as the headline
 *  would and grows with it; hovered or focused it sits on a tint. Enter sends `onEnter` and
 *  never breaks the line, and a pasted line break arrives as a space. */
export const view = <Message>(
  config: ViewConfig<Message>,
  h: HtmlBuilder<Message>
): Html => {
  const { id, label, value, onInput, onEnter, attributes = [] } = config;

  return h.textarea([
    ...attributes,
    h.Id(id),
    h.AriaLabel(label),
    h.Rows(1),
    h.Spellcheck(false),
    h.Value(value),
    h.OnInput((typed) => onInput(typed.replaceAll(/\r\n?|\n/gu, " "))),
    h.OnKeyDownPreventDefault((key) =>
      key === "Enter" ? Option.some(onEnter) : Option.none()
    ),
    h.Class("gg-title-field"),
  ]);
};
