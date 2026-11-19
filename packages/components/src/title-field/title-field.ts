import { Option, Stream } from "effect";
import * as Dom from "foldkit/dom";
import type {
  ChildAttribute,
  Html,
  HtmlBuilder,
  TextareaAttribute,
} from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import * as Mount from "foldkit/mount";

import { isUnhandledPlainKey } from "../keys/keys.ts";

/** What the field's Enter Mount reports besides an Enter: it started listening. Nothing in a
 *  Model follows it. */
export const Message = defineMessageUnion({ CompletedBindTitleKeys: {} });

export type Message = typeof Message.Type;

export type ViewConfig<ParentMessage> = Readonly<{
  id: string;
  /** The field's name for screen readers, since the title is its own label: `"Title"`. */
  label: string;
  value: string;
  /** Sent with each edit, its line breaks (from a paste) turned into spaces: a title is one
   *  line. */
  onInput: (value: string) => ParentMessage;
  /** Sent on a plain Enter that nothing else took, which never breaks the line: the title is
   *  done. An Enter that confirms an IME's composition, or with Shift, Ctrl, Alt or Cmd, is
   *  left alone. The field takes it as it mounts, so a field whose `onEnter` names another
   *  item takes another `id`: it is keyed by it. */
  onEnter: ParentMessage;
  /** Lifts the Enter Mount's lifecycle Message, which the parent's update takes and changes
   *  nothing for. In a Scene, resolve the Mount by name with it, never with `onEnter`:
   *  `Scene.Mount.resolve({ name: TitleField.BindTitleKeys.name }, toParentMessage(TitleField.Message.CompletedBindTitleKeys()))`. */
  toParentMessage: (message: Message) => ParentMessage;
  /** Further attributes for the `<textarea>`, such as a Dialog's `initialFocus` group; never
   *  a class. */
  attributes?: ReadonlyArray<TextareaAttribute<ParentMessage> | ChildAttribute>;
}>;

const KeyMessage = defineMessageUnion({ PressedEnter: {} });

type KeyMessage = typeof KeyMessage.Type;

const titleKey = (event: KeyboardEvent): Option.Option<KeyMessage> =>
  Option.liftPredicate(
    KeyMessage.PressedEnter(),
    () => event.key === "Enter" && isUnhandledPlainKey(event)
  );

/** Reports `CompletedBindTitleKeys` once it listens, then each plain Enter that nothing else
 *  took, its default prevented, which `view` sends as `onEnter`. Attached by `view` to a box
 *  around the field, so an `OnMount` in `attributes` keeps the field's own. */
export const BindTitleKeys = Mount.defineStream("BindTitleKeys", {
  messages: [Message.CompletedBindTitleKeys, KeyMessage.PressedEnter],
  execute: ({ element }) =>
    Stream.concat(
      Stream.make(Message.CompletedBindTitleKeys()),
      Dom.streamFromEventFilterMapPreventDefault({
        target: element,
        type: "keydown",
        filterMapEvent: titleKey,
      })
    ),
});

/** A title edited where it is printed: a headline in bold that is its own field, so a task's
 *  title is never printed twice, once to read and once to edit. It wraps as the headline
 *  would and grows with it; hovered or focused it sits on a tint. Enter sends `onEnter` and
 *  never breaks the line, and a pasted line break arrives as a space. */
export const view = <ParentMessage>(
  config: ViewConfig<ParentMessage>,
  h: HtmlBuilder<ParentMessage>
): Html => {
  const {
    id,
    label,
    value,
    onInput,
    onEnter,
    toParentMessage,
    attributes = [],
  } = config;

  return h.keyed("span")(
    id,
    [
      h.OnMount(
        Mount.mapMessage(BindTitleKeys(), (message) =>
          message._tag === "PressedEnter" ? onEnter : toParentMessage(message)
        )
      ),
      h.Class("gg-title-field-keys"),
    ],
    [
      h.textarea([
        ...attributes,
        h.Id(id),
        h.AriaLabel(label),
        h.Rows(1),
        h.Spellcheck(false),
        h.Value(value),
        h.OnInput((typed) => onInput(typed.replaceAll(/\r\n?|\n/gu, " "))),
        h.Class("gg-title-field"),
      ]),
    ]
  );
};
