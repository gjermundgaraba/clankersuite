import { Option, Stream } from "effect";
import * as Dom from "foldkit/dom";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import * as Mount from "foldkit/mount";

import * as IconButton from "../icon-button/icon-button.ts";
import { isUnhandledPlainKey } from "../keys/keys.ts";

/** The pane's top line: where its item lives at the left, and a close glyph at the right. */
export type Top<Message> = Readonly<{
  /** Where the item lives: an area's Marker and name, `›` its parent. */
  context: ReadonlyArray<Html | string>;
  /** Before the close glyph: a quiet Menu of what else can be done to the item (mark it done,
   *  archive it, delete it). */
  menu?: Html;
  /** The close glyph's name: `"Close the details"`. */
  closeLabel: string;
  onClose: Message;
}>;

/** What the pane's Escape Mount reports besides an Escape: it started listening. Nothing in
 *  a Model follows it. */
export const Message = defineMessageUnion({ CompletedBindEscape: {} });

export type Message = typeof Message.Type;

const KeyMessage = defineMessageUnion({ PressedEscape: {} });

type KeyMessage = typeof KeyMessage.Type;

/** Configuration for rendering a side pane with `view`. */
export type ViewConfig<ParentMessage> = Readonly<{
  /** Names the pane for screen readers ("Task details"). */
  label: string;
  top?: Top<ParentMessage>;
  /** The pane's contents, flat: a `titleView`, a flat PropsList, a `notesView`, subtasks in a
   *  Rows section. */
  body: ReadonlyArray<Html | string>;
}> &
  (
    | Readonly<{
        /** Sent for an Escape in the pane that nothing inside it took: an InlineInput's or a
         *  Menu's Escape ends that first, and only a second one closes the pane. Its default
         *  is prevented. */
        onEscape: ParentMessage;
        /** Lifts the Escape Mount's lifecycle Message, which the parent's update takes and
         *  changes nothing for. In a Scene, resolve the Mount by name with it, never with
         *  `onEscape`:
         *  `Scene.Mount.resolve({ name: SidePane.BindEscape.name }, toParentMessage(SidePane.Message.CompletedBindEscape()))`. */
        toParentMessage: (message: Message) => ParentMessage;
      }>
    | Readonly<{ onEscape?: never; toParentMessage?: never }>
  );

const paneKey = (event: KeyboardEvent): Option.Option<KeyMessage> =>
  Option.liftPredicate(
    KeyMessage.PressedEscape(),
    () => event.key === "Escape" && isUnhandledPlainKey(event)
  );

/** Reports `CompletedBindEscape` once it listens, then an Escape in the pane that no child
 *  handled, its default prevented. Attached by `view` when it has an `onEscape`. */
export const BindEscape = Mount.defineStream("BindEscape", {
  messages: [Message.CompletedBindEscape, KeyMessage.PressedEscape],
  execute: ({ element }) =>
    Stream.concat(
      Stream.make(Message.CompletedBindEscape()),
      Dom.streamFromEventFilterMapPreventDefault({
        target: element,
        type: "keydown",
        filterMapEvent: paneKey,
      })
    ),
});

const topView = <Message>(top: Top<Message>, h: HtmlBuilder<Message>): Html =>
  h.div(
    [h.Class("gg-side-pane-top")],
    [
      h.span([h.Class("gg-side-pane-context")], top.context),
      ...(top.menu === undefined ? [] : [top.menu]),
      IconButton.view(
        {
          glyph: "cross",
          label: top.closeLabel,
          isQuiet: true,
          onClick: top.onClose,
        },
        h
      ),
    ]
  );

/** Configuration for rendering a side pane's title with `titleView`. */
export type TitleConfig = Readonly<{
  /** A row's check (`Rows.checkView`) beside the title. */
  check?: Html;
  /** The title, usually a TitleField, so it is edited where it is printed. */
  title: Html;
}>;

/** The item's title in the pane, its check beside it, as a task's row prints them. */
export const titleView = <Message>(
  config: TitleConfig,
  h: HtmlBuilder<Message>
): Html =>
  h.div(
    [h.Class("gg-side-pane-title")],
    [...(config.check === undefined ? [] : [config.check]), config.title]
  );

/** Configuration for rendering the item's notes with `notesView`. */
export type NotesConfig = Readonly<{
  /** A MarkdownEditor with its label hidden and a placeholder (`"Notes, in Markdown…"`),
   *  which shows its own rule only while focused, or the notes as text. */
  body: ReadonlyArray<Html | string>;
}>;

/** The item's notes under a rule. */
export const notesView = <Message>(
  config: NotesConfig,
  h: HtmlBuilder<Message>
): Html => h.div([h.Class("gg-side-pane-notes")], config.body);

/** A column at the page's right, from under the top bar (or the window's top) to its bottom as
 *  a Rail is at its left, on the surface with a hairline at its left edge: a labelled `aside`,
 *  the details of what the page has chosen, laid out flat. Its `top` line says where the item
 *  lives and closes the pane, as does an Escape nothing in it took (`onEscape`). The
 *  application renders it in a Rail's `toPaneView` while it has something to show, and the
 *  page keeps its width clear while it is there. Where the room right of the rail holds less
 *  than the pane and the narrowest deck, it covers the page beside the rail, and the page
 *  under it is hidden but for a dialog opened in it. */
export const view = <ParentMessage>(
  config: ViewConfig<ParentMessage>,
  h: HtmlBuilder<ParentMessage>
): Html => {
  const { label, top, body, onEscape, toParentMessage } = config;

  return h.aside(
    [
      h.AriaLabel(label),
      ...(onEscape === undefined || toParentMessage === undefined
        ? []
        : [
            h.OnMount(
              Mount.mapMessage(BindEscape(), (message) =>
                message._tag === "PressedEscape"
                  ? onEscape
                  : toParentMessage(message)
              )
            ),
          ]),
      h.Class("gg-side-pane"),
    ],
    [...(top === undefined ? [] : [topView(top, h)]), ...body]
  );
};
