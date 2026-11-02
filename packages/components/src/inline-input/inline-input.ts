import { Input as UiInput } from "@foldkit/ui";
import { Effect, Match, Option, Schema, String, pipe } from "effect";
import * as Command from "foldkit/command";
import * as Dom from "foldkit/dom";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import * as Mount from "foldkit/mount";
import { defineTaggedUnion } from "foldkit/schema";
import { modifyFields } from "foldkit/struct";
import { defineView } from "foldkit/submodel";
import type * as Update from "foldkit/update";

import { isPlain } from "../keys/keys.ts";
import * as Notice from "../notice/notice.ts";

const SaveTrigger = Schema.Literals(["Enter", "Blur"]);

type SaveTrigger = typeof SaveTrigger.Type;

const InlineEnd = Schema.Literals(["Enter", "Blur", "Escape"]);

type InlineEnd = typeof InlineEnd.Type;

const Phase = defineTaggedUnion({
  Editing: {},
  Saving: { trigger: SaveTrigger },
  LeftWhileSaving: {},
  Ended: {},
});

type Phase = typeof Phase.Type;

/** Schema for an inline field. `maybeDraft` is none while the field is untouched: it then
 *  shows, and follows, the value it replaces. `replaced` is that value as the view had it at
 *  the last edit, so a draft that only restores it writes nothing. `maybeError` is why the
 *  last save was refused, until the draft changes or the next save goes out.
 *  `maybeLastSavedId` is the id of the item the edit saved last. */
export const Model = Schema.Struct({
  id: Schema.String,
  phase: Phase,
  maybeDraft: Schema.Option(Schema.String),
  replaced: Schema.String,
  maybeError: Schema.Option(Schema.String),
  maybeLastSavedId: Schema.Option(Schema.String),
  isRepeating: Schema.Boolean,
});

export type Model = typeof Model.Type;

/** Union of all Messages an inline field can produce. `UpdatedDraft` carries the draft and the
 *  value it replaces, as the view had it. */
export const Message = defineMessageUnion({
  UpdatedDraft: { value: Schema.String, replaced: Schema.String },
  PressedEnter: {},
  PressedEscape: {},
  BlurredField: {},
  CompletedFocusField: {},
});

export type Message = typeof Message.Type;

/** Union of OutMessages an inline field reports. `Committed`: save this text (new, non-empty,
 *  trimmed); the field holds until the caller reports back with `succeeded` or `failed`.
 *  `Ended`: the edit is over, with how it ended and the id of the item it saved last
 *  (`maybeLastSavedId`, none when it saved nothing). Move focus on `Enter` and `Escape` only:
 *  after `Blur` the reader chose where focus went. */
export const OutMessage = defineMessageUnion({
  Committed: { text: Schema.String },
  Ended: { how: InlineEnd, maybeLastSavedId: Schema.Option(Schema.String) },
});

export type OutMessage = typeof OutMessage.Type;

/** Focuses the field once it renders, selecting its text as an edit begins. */
export const FocusField = Command.define("FocusField", {
  args: { id: Schema.String },
  messages: [Message.CompletedFocusField],
  execute: ({ id }) =>
    Dom.focus(`#${CSS.escape(id)}`).pipe(
      Effect.andThen(
        Effect.sync(() => {
          const field = document.querySelector(`#${CSS.escape(id)}`);

          if (field instanceof HTMLInputElement) {
            field.select();
          }
        })
      ),
      Effect.ignore,
      Effect.as(Message.CompletedFocusField())
    ),
});

/** Configuration for starting an inline edit with `init`. The `id` (the input's) must be
 *  unique in the document. `isRepeating`: adding several, so a save from Enter empties the
 *  field and keeps it open for the next instead of ending. */
export type InitConfig = Readonly<{ id: string; isRepeating?: boolean }>;

/** Starts an inline edit, untouched, focusing and selecting the field. Fold it in with
 *  `Update.foldChildInit`. */
export const init = (config: InitConfig): Update.Return<Model, Message> => ({
  model: {
    id: config.id,
    phase: Phase.Editing(),
    maybeDraft: Option.none(),
    replaced: "",
    maybeError: Option.none(),
    maybeLastSavedId: Option.none(),
    isRepeating: config.isRepeating ?? false,
  },
  commands: [FocusField({ id: config.id })],
});

/** Whether the caller's save is out: the field holds until `succeeded` or `failed`. */
export const isSaving = (model: Model): boolean =>
  Phase.guards.Saving(model.phase) || Phase.guards.LeftWhileSaving(model.phase);

/** Why the last save was refused, while the field still holds that text: none before a save
 *  fails, and again once the draft changes or the next save goes out. */
export const maybeError = (model: Model): Option.Option<string> =>
  model.maybeError;

const errorId = (model: Model): string => UiInput.descriptionId(model.id);

type UpdateReturn = Update.ReturnWithOutMessage<Model, Message, OutMessage>;

const end = (model: Model, how: InlineEnd): UpdateReturn => ({
  model: modifyFields(model, { phase: () => Phase.Ended() }),
  outMessage: OutMessage.Ended({
    how,
    maybeLastSavedId: model.maybeLastSavedId,
  }),
});

export const toWrite = (
  maybeDraft: Option.Option<string>,
  value: string
): Option.Option<string> =>
  pipe(
    maybeDraft,
    Option.map(String.trim),
    Option.filter((text) => String.isNonEmpty(text) && text !== value)
  );

const commit = (model: Model, trigger: SaveTrigger): UpdateReturn =>
  Option.match(toWrite(model.maybeDraft, model.replaced), {
    onNone: () => end(model, trigger),
    onSome: (text) => ({
      model: modifyFields(model, {
        phase: () => Phase.Saving({ trigger }),
        maybeError: () => Option.none(),
      }),
      outMessage: OutMessage.Committed({ text }),
    }),
  });

/** Processes an inline field Message and returns the next Model, Commands and OutMessage. */
export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    UpdatedDraft: ({ value, replaced }) =>
      Phase.guards.Editing(model.phase)
        ? {
            model: modifyFields(model, {
              maybeDraft: () => Option.some(value),
              replaced: () => replaced,
              maybeError: () => Option.none(),
            }),
          }
        : { model },
    PressedEnter: () =>
      Phase.guards.Editing(model.phase) ? commit(model, "Enter") : { model },
    PressedEscape: () =>
      Phase.guards.Editing(model.phase) ? end(model, "Escape") : { model },
    BlurredField: () =>
      Phase.match<UpdateReturn>(model.phase, {
        Editing: () => commit(model, "Blur"),
        Saving: () => ({
          model: modifyFields(model, {
            phase: () => Phase.LeftWhileSaving(),
          }),
        }),
        LeftWhileSaving: () => ({ model }),
        Ended: () => ({ model }),
      }),
    CompletedFocusField: () => ({ model }),
  });

const savedAs = (model: Model, savedId: string): Model =>
  modifyFields(model, { maybeLastSavedId: () => Option.some(savedId) });

/** The caller's save went through, giving the saved item's id. A save from Enter in a
 *  repeating field empties the field and keeps it open, focused, for the next; any other
 *  save ends the edit (as `Blur` if focus left meanwhile). A result for an edit that is no
 *  longer saving changes nothing. */
export const succeeded = (model: Model, savedId: string): UpdateReturn =>
  Phase.match<UpdateReturn>(model.phase, {
    Saving: ({ trigger }) => {
      const saved = savedAs(model, savedId);

      return model.isRepeating && trigger === "Enter"
        ? {
            model: modifyFields(saved, {
              phase: () => Phase.Editing(),
              maybeDraft: () => Option.some(""),
            }),
          }
        : end(saved, trigger);
    },
    LeftWhileSaving: () => end(savedAs(model, savedId), "Blur"),
    Editing: () => ({ model }),
    Ended: () => ({ model }),
  });

/** The caller's save did not go through: the field stays open with its text for another try.
 *  With an `error` (a refusal) it says why through `errorView`; without one (the save's
 *  outcome is told elsewhere, such as a lost connection's notice) it only lets go of the
 *  text. It reports nothing, so it folds as a plain return. A result for an edit that is no
 *  longer saving changes nothing. */
export const failed = (
  model: Model,
  error?: string
): Update.Return<Model, Message> =>
  isSaving(model)
    ? {
        model: modifyFields(model, {
          phase: () => Phase.Editing(),
          maybeError: () => Option.fromNullishOr(error),
        }),
      }
    : { model };

type KeyMessage =
  | typeof Message.PressedEnter.Type
  | typeof Message.PressedEscape.Type;

export const fieldKey = (event: KeyboardEvent): Option.Option<KeyMessage> =>
  event.isComposing || event.defaultPrevented || !isPlain(event)
    ? Option.none()
    : Match.value(event.key).pipe(
        Match.withReturnType<Option.Option<KeyMessage>>(),
        Match.when("Enter", () => Option.some(Message.PressedEnter())),
        Match.when("Escape", () => Option.some(Message.PressedEscape())),
        Match.orElse(() => Option.none())
      );

/** The field's keys: Enter saves (or ends, with nothing new to save) and Escape discards and
 *  ends, while the edit is open. A key an IME is composing, a modified key and a key someone
 *  already handled are left alone; a key it takes has its default prevented, so an Escape here
 *  never also closes the dialog around the field. Attached by `view`. In a Scene, resolve it
 *  with `Message.PressedEscape`. */
export const BindFieldKeys = Mount.defineStream("BindFieldKeys", {
  messages: [Message.PressedEnter, Message.PressedEscape],
  execute: ({ element }) =>
    Dom.streamFromEventFilterMapPreventDefault({
      target: element,
      type: "keydown",
      filterMapEvent: fieldKey,
    }),
});

/** Per-render inputs passed to `view` through `h.submodel`'s `viewInputs`. */
export type ViewInputs = Readonly<{
  /** The text being replaced; `""` when adding. */
  value: string;
  /** Names the field for screen readers (`"Rename Notes"`, `"New item in Operations"`). */
  label: string;
  placeholder?: string;
}>;

/**
 * Text edited in place: an input that takes exactly the height of what it replaces, built on
 * `@foldkit/ui`'s Input. Enter or leaving the field with new text reports `Committed`; the
 * field then holds (`readonly`, `aria-busy`, still focused) until the caller reports
 * `succeeded` or `failed`. A refused save keeps the text, marks the field `aria-invalid` and
 * points it at `errorView`. Escape discards the draft and ends. The field moves no focus
 * itself: the caller does on `Ended`.
 */
export const view = defineView<Model, Message, ViewInputs>(
  (model, viewInputs, h): Html => {
    const { value, label, placeholder } = viewInputs;
    const isHeld = isSaving(model);
    const hasError = Option.isSome(model.maybeError);

    return UiInput.view(
      {
        id: model.id,
        value: Option.getOrElse(model.maybeDraft, () => value),
        onInput: (draft) =>
          Message.UpdatedDraft({ value: draft, replaced: value }),
        isReadOnly: isHeld,
        isInvalid: hasError,
        hasDescription: hasError,
        ...(placeholder !== undefined && { placeholder }),
        toView: (groups) =>
          h.input([
            ...groups.input,
            h.AriaLabel(label),
            ...(isHeld ? [h.AriaBusy(true)] : []),
            h.Autocomplete("off"),
            h.OnBlur(Message.BlurredField()),
            h.OnMount(BindFieldKeys()),
            h.Class("inline-input"),
          ]),
      },
      h
    );
  }
);

/** Why the last save was refused, as an error Notice with the id the field points at, or
 *  nothing. Place it under the field. */
export const errorView = <ParentMessage>(
  model: Model,
  h: HtmlBuilder<ParentMessage>
): Html =>
  Option.match(model.maybeError, {
    onNone: () => h.empty,
    onSome: (shown) =>
      Notice.view(
        { tone: "Error", body: [shown], attributes: [h.Id(errorId(model))] },
        h
      ),
  });
