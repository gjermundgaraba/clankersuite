import type { GlyphName } from "@gjermundgaraba/icons";
import { Array, Schema } from "effect";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import * as Mount from "foldkit/mount";

import * as Button from "../button/button.ts";
import * as DatePicker from "../date-picker/date-picker.ts";

/** One property: its label, its value and its controls. */
export type Prop = Readonly<{
  /** Unique in the list. */
  label: string;
  value: ReadonlyArray<Html | string>;
  /** Prints the value as code: a key, an id, a path. */
  isCode?: boolean;
  /** Controls for the row, at the right: a copy button, an edit. */
  actions?: ReadonlyArray<Html | string>;
}>;

/** Configuration for rendering a props list with `view`. */
export type ViewConfig = Readonly<{
  items: readonly Prop[];
  /** No rules, the labels quiet in a narrow column and the values as tall as a control: a
   *  side pane's properties, whose values are quiet buttons that open menus. */
  isFlat?: boolean;
}>;

const propView =
  <Message>(h: HtmlBuilder<Message>) =>
  ({ label, value, isCode = false, actions = [] }: Prop): Html =>
    h.keyed("div")(
      label,
      [],
      [
        h.dt([], [label]),
        h.dd([], isCode ? [h.code([], value)] : value),
        h.dd([h.Class("gg-acts")], actions),
      ]
    );

/** A description list: a label, the value, and an action column, one row
 *  each, as tall as a Rows row. */
export const view = <Message>(
  config: ViewConfig,
  h: HtmlBuilder<Message>
): Html =>
  h.dl(
    [h.Class(config.isFlat === true ? "gg-props gg-flat" : "gg-props")],
    Array.map(config.items, propView(h))
  );

/** What a date's input Mount reports: it started opening its picker from its button. Nothing
 *  in a Model follows it. */
export const Message = defineMessageUnion({ CompletedBindDatePicker: {} });

export type Message = typeof Message.Type;

/** A date's input Mount (`bindPicker`). Menu's day inputs mount `Menu.BindDayInput` instead,
 *  so a Scene can tell the two apart by name. */
export const BindDatePicker = Mount.define("BindDatePicker", {
  args: { returnFocusId: Schema.String },
  messages: [Message.CompletedBindDatePicker],
  execute: DatePicker.bindPicker(Message.CompletedBindDatePicker()),
});

/** Configuration for rendering a date value with `dateView`. */
export type DateConfig<ParentMessage> = Readonly<{
  /** Unique in the document: the picker's hidden input takes it, the button `${id}-button`. */
  id: string;
  /** The property's label, said with what the button prints as its name: "Due date, None". */
  label: string;
  /** The day as `YYYY-MM-DD`, or `""` for none. */
  value: string;
  /** What the button prints: the day as the application writes it (`"Fri 2 Jan"`, with the
   *  year when it is not this one), or `"None"` while there is no day. */
  shown: string;
  glyph?: GlyphName;
  /** The day picked, as `YYYY-MM-DD`, or `""` once it is cleared. */
  onChange: (value: string) => ParentMessage;
  /** Lifts the Mount's lifecycle Message into the parent's, which the parent's update takes
   *  and changes nothing for. In a Scene, resolve it by name:
   *  `Scene.Mount.resolve({ name: PropsList.BindDatePicker.name }, toParentMessage(PropsList.Message.CompletedBindDatePicker()))`. */
  toParentMessage: (message: Message) => ParentMessage;
}>;

/** A flat list's date value: a quiet button that prints `shown` and opens the browser's date
 *  picker (`aria-haspopup="dialog"`, the picker being a dialog the browser draws), whose day
 *  it reports through `onChange`. The picker's input sits hidden beside the button, out of
 *  the keyboard's order and screen readers' reach: the button is the control. */
export const dateView = <ParentMessage>(
  config: DateConfig<ParentMessage>,
  h: HtmlBuilder<ParentMessage>
): Html => {
  const { id, label, value, shown, glyph, onChange, toParentMessage } = config;
  const buttonId = `${id}-button`;

  return h.span(
    [h.Class("gg-prop-date")],
    [
      Button.view(
        {
          label: shown,
          variant: "Quiet",
          ...(glyph !== undefined && { glyph }),
          attributes: [
            h.Id(buttonId),
            h.AriaLabel(`${label}, ${shown}`),
            ...DatePicker.openerAttributes(id, h),
          ],
        },
        h
      ),
      DatePicker.inputView(
        {
          id,
          value,
          onChange,
          mount: Mount.mapMessage(
            BindDatePicker({ returnFocusId: buttonId }),
            toParentMessage
          ),
        },
        h
      ),
    ]
  );
};
