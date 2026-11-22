import { Card, Chip, Field, KeyHint, Wrap } from "@gjermundgaraba/components";
import type { GlyphName } from "@gjermundgaraba/icons";
import { Array, Match, Option, Schema, Stream, String } from "effect";
import { Mount } from "foldkit";
import type { Update } from "foldkit";
import * as Dom from "foldkit/dom";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";

type Task = Readonly<{
  id: string;
  title: string;
  context: string;
  glyph: GlyphName;
}>;

const TASKS: readonly Task[] = [
  {
    id: "launch",
    title: "Launch clankermem v1",
    context: "Work",
    glyph: "layers",
  },
  {
    id: "guide",
    title: "Write migration guide",
    context: "Work › Launch clankermem v1",
    glyph: "corner-down-right",
  },
  { id: "budget", title: "Review budget", context: "Work", glyph: "layers" },
];

const GOALS = [{ tag: "+mem", title: "Launch clankermem v1" }] as const;

export const Model = Schema.Struct({
  value: Schema.String,
  maybeActiveId: Schema.Option(Schema.String),
});

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  UpdatedValue: { value: Schema.String },
  PressedArrow: { isDown: Schema.Boolean },
  PressedEnter: {},
  CompletedBindCaptureKeys: {},
  PickedTask: { id: Schema.String },
  GotFieldMessage: { message: Field.Message },
});

export type Message = typeof Message.Type;

const QUERY_PATTERN = /(?:^|\s)@(?<query>[^@]*)$/u;

const maybeQuery = (value: string): Option.Option<string> =>
  Option.fromNullishOr(QUERY_PATTERN.exec(value)?.groups?.["query"]);

const isPicked = (value: string, task: Task): boolean =>
  String.includes(`@${task.title}`)(value);

export const found = (value: string): readonly Task[] =>
  Option.match(maybeQuery(value), {
    onNone: () => [],
    onSome: (query) =>
      Array.filter(
        TASKS,
        (task) =>
          !isPicked(value, task) &&
          Array.every(
            String.split(String.toLowerCase(String.trim(query)), /\s+/u),
            (word) => String.includes(word)(String.toLowerCase(task.title))
          )
      ),
  });

const firstId = (value: string): Option.Option<string> =>
  Option.map(Array.head(found(value)), (task) => task.id);

export const init = (): Update.Return<Model, Message> => {
  const value = "Write release notes fri +mem @Launch";

  return { model: { value, maybeActiveId: firstId(value) } };
};

const moved = (model: Model, isDown: boolean): Option.Option<string> => {
  const tasks = found(model.value);

  const index = Option.getOrElse(
    Option.flatMap(model.maybeActiveId, (activeId) =>
      Array.findFirstIndex(tasks, (task) => task.id === activeId)
    ),
    () => -1
  );

  const next = Math.min(
    Math.max(index + (isDown ? 1 : -1), 0),
    tasks.length - 1
  );

  return Option.map(Array.get(tasks, next), (task) => task.id);
};

const picked = (value: string, task: Task): string =>
  value.replace(QUERY_PATTERN, (whole) =>
    whole.startsWith("@") ? `@${task.title} ` : ` @${task.title} `
  );

export const update = (
  model: Model,
  message: Message
): Update.Return<Model, Message> =>
  Message.match<Update.Return<Model, Message>>(message, {
    UpdatedValue: ({ value }) => ({
      model: { value, maybeActiveId: firstId(value) },
    }),
    PressedArrow: ({ isDown }) => ({
      model: modifyFields(model, { maybeActiveId: () => moved(model, isDown) }),
    }),
    PressedEnter: () =>
      Array.isReadonlyArrayNonEmpty(found(model.value))
        ? Option.match(model.maybeActiveId, {
            onNone: () => ({ model }),
            onSome: (id) => update(model, Message.PickedTask({ id })),
          })
        : { model },
    CompletedBindCaptureKeys: () => ({ model }),
    PickedTask: ({ id }) => ({
      model: Option.match(
        Array.findFirst(TASKS, (task) => task.id === id),
        {
          onNone: () => model,
          onSome: (task) => ({
            value: picked(model.value, task),
            maybeActiveId: Option.none(),
          }),
        }
      ),
    }),
    GotFieldMessage: () => ({ model }),
  });

const tokenMarks = (
  value: string,
  pattern: RegExp,
  tone: Field.MarkTone
): readonly Field.Mark[] =>
  Array.map(Array.fromIterable(value.matchAll(pattern)), (match) => ({
    start: match.index,
    end: match.index + match[0].length,
    tone,
  }));

const marksOf = (value: string): readonly Field.Mark[] => [
  ...tokenMarks(value, /\bfri\b/gu, "Warning"),
  ...tokenMarks(value, /\+\S+/gu, "Accent"),
  ...Array.flatMap(TASKS, (task) => {
    const start = value.indexOf(`@${task.title}`);

    return start === -1
      ? []
      : [
          {
            start,
            end: start + task.title.length + 1,
            tone: "Link" as const,
          },
        ];
  }),
];

const isUnhandledPlainKey = (event: KeyboardEvent): boolean =>
  !event.isComposing &&
  !event.defaultPrevented &&
  !event.altKey &&
  !event.ctrlKey &&
  !event.metaKey &&
  !event.shiftKey;

type KeyMessage =
  | typeof Message.PressedEnter.Type
  | typeof Message.PressedArrow.Type;

export const captureKey = (event: KeyboardEvent): Option.Option<KeyMessage> =>
  isUnhandledPlainKey(event)
    ? Match.value(event.key).pipe(
        Match.withReturnType<Option.Option<KeyMessage>>(),
        Match.when("Enter", () => Option.some(Message.PressedEnter())),
        Match.when("ArrowDown", () =>
          Option.some(Message.PressedArrow({ isDown: true }))
        ),
        Match.when("ArrowUp", () =>
          Option.some(Message.PressedArrow({ isDown: false }))
        ),
        Match.orElse(() => Option.none())
      )
    : Option.none();

export const BindCaptureKeys = Mount.defineStream("BindCaptureKeys", {
  messages: [
    Message.CompletedBindCaptureKeys,
    Message.PressedEnter,
    Message.PressedArrow,
  ],
  execute: ({ element }) =>
    Stream.concat(
      Stream.make(Message.CompletedBindCaptureKeys()),
      Dom.streamFromEventFilterMapPreventDefault({
        target: element,
        type: "keydown",
        filterMapEvent: captureKey,
      })
    ),
});

const parentOf = (value: string): Option.Option<Task> =>
  Array.findFirst(TASKS, (task) => isPicked(value, task));

const chipsView = (model: Model, h: HtmlBuilder<Message>): readonly Html[] => [
  ...(/\bfri\b/u.test(model.value)
    ? [Chip.view({ label: "Fri 20 Nov", glyph: "calendar" }, h)]
    : []),
  ...Array.map(
    Array.filter(GOALS, (goal) =>
      Array.contains(model.value.split(/\s+/u), goal.tag)
    ),
    (goal) =>
      Chip.view(
        { label: goal.title, marker: { colour: "Coral", kind: "Goal" } },
        h
      )
  ),
  ...Option.toArray(
    Option.map(parentOf(model.value), (task) =>
      Chip.view({ label: task.title, glyph: "corner-down-right" }, h)
    )
  ),
];

export const view = (model: Model, h: HtmlBuilder<Message>): Html => {
  const tasks = found(model.value);

  return Card.view(
    {
      head: Field.view(
        {
          id: "field-capture",
          label: "New task",
          isLabelHidden: true,
          look: "Sheet",
          value: model.value,
          onInput: (value) => Message.UpdatedValue({ value }),
          marks: marksOf(model.value),
          inputAttributes: [h.OnMount(BindCaptureKeys())],
          suggestions: {
            label: "Put it under",
            activeId: Option.getOrUndefined(model.maybeActiveId),
            options: Array.map(tasks, (task) => ({
              id: task.id,
              title: task.title,
              context: task.context,
              glyph: task.glyph,
              onPick: Message.PickedTask({ id: task.id }),
            })),
            toParentMessage: (message) => Message.GotFieldMessage({ message }),
          },
        },
        h
      ),
      body: [Wrap.view({ body: chipsView(model, h) }, h)],
      keyNotes: {
        notes: [
          { keys: "#", does: "area" },
          { keys: "Plus", does: "goal" },
          { keys: "@", does: "under a task" },
        ],
        platform: "Other",
      },
      lead: ["dates: fri, due fri"],
      actions: KeyHint.notesView(
        [
          { keys: "Enter", does: "save, stay open" },
          { keys: "Escape", does: "done" },
        ],
        "Other",
        h
      ),
    },
    h
  );
};
