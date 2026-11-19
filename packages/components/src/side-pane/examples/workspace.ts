import {
  Button,
  Chip,
  Deck,
  IconButton,
  KeyHint,
  LinkState,
  Marker,
  Menu,
  PageHead,
  Places,
  PropsList,
  Rail,
  Rows,
  SidePane,
  StatusBar,
  TitleField,
  Wordmark,
} from "@gjermundgaraba/components";
import { Glyph } from "@gjermundgaraba/icons";
import type { GlyphName } from "@gjermundgaraba/icons";
import { Array, Effect, Option, Schema } from "effect";
import { Command, Subscription, Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";

const Task = Schema.Literals([
  "Quarterly taxes",
  "Review budget",
  "Collect receipts",
  "Write migration guide",
  "Call mom",
  "Draft the proposal",
  "Plan christmas trip",
  "Answer Lars about the offsite",
]);

type Task = typeof Task.Type;

const Place = Schema.Literals([
  "Inbox",
  "Focus",
  "Outline",
  "Someday",
  "Goals & values",
  "Work",
  "Review budget",
  "Launch clankermem v1",
  "Ten-user beta: send invites",
  "Home",
]);

type Place = typeof Place.Type;

const When = Schema.Literals([
  "Focus",
  "This evening",
  "Tomorrow",
  "Anytime",
  "Someday",
]);

type When = typeof When.Type;

const DETAILS: Readonly<Partial<Record<Task, string>>> = {
  "Quarterly taxes": "File the third quarter before the late fee starts.",
  "Review budget": "Go through next quarter's numbers with the team.",
  "Collect receipts": "The travel receipts for the budget review.",
  "Write migration guide": "From the old summary format to the tree.",
  "Draft the proposal": "Two pages: the goal, the budget and who signs off.",
  "Plan christmas trip": "Trains, a place to stay, who brings what.",
  "Answer Lars about the offsite": "He asked which week suits.",
};

export const Model = Schema.Struct({
  platform: KeyHint.KeyPlatform,
  rail: Rail.Model,
  maybeRailWidth: Schema.Option(Schema.Finite),
  place: Place,
  maybeTask: Schema.Option(Task),
  doneTasks: Schema.Array(Task),
  paneTitle: Schema.String,
  whenMenu: Menu.Model,
  when: When,
});

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  CompletedDetectKeyPlatform: { platform: KeyHint.KeyPlatform },
  SelectedPlace: { place: Place },
  SelectedTask: { task: Task },
  ToggledDone: { task: Task, isDone: Schema.Boolean },
  ClickedClosePane: {},
  UpdatedPaneTitle: { value: Schema.String },
  PressedPaneEnter: {},
  ClickedProperty: {},
  GotWhenMessage: { message: Menu.Message },
  GotRailMessage: { message: Rail.Message },
  GotStatusBarMessage: { message: StatusBar.Message },
});

export type Message = typeof Message.Type;

const DetectKeyPlatform = Command.define("DetectKeyPlatform", {
  messages: [Message.CompletedDetectKeyPlatform],
  execute: KeyHint.detectKeyPlatform.pipe(
    Effect.map((platform) => Message.CompletedDetectKeyPlatform({ platform }))
  ),
});

export const init = (): Update.Return<Model, Message> => ({
  model: {
    platform: "Other",
    rail: Rail.init({ id: "workspace-rail" }),
    maybeRailWidth: Option.none(),
    place: "Focus",
    maybeTask: Option.some("Review budget"),
    doneTasks: ["Answer Lars about the offsite"],
    paneTitle: "Review budget",
    whenMenu: Menu.init({ id: "workspace-when" }),
    when: "Focus",
  },
  commands: [DetectKeyPlatform()],
});

const toRailMessage = (message: Rail.Message): Message =>
  Message.GotRailMessage({ message });

const railFold = {
  read: (model: Model) => Option.some(model.rail),
  write: (model: Model, rail: Rail.Model): Model =>
    modifyFields(model, { rail: () => rail }),
  toParentMessage: toRailMessage,
};

const foldRail = Update.foldChild({
  update: Rail.update,
  ...railFold,
  foldOutMessage: Rail.OutMessage.match<Update.Step<Model, Message>>({
    ResizedRail:
      ({ width }) =>
      (model) => ({
        model: modifyFields(model, {
          maybeRailWidth: () => Option.some(width),
        }),
      }),
  }),
});

const foldRailClose = Update.foldChildStep({ update: Rail.close, ...railFold });

const isWhen = Schema.is(When);

const foldWhen = Update.foldChild({
  update: Menu.update,
  read: (model: Model) => Option.some(model.whenMenu),
  write: (model: Model, whenMenu: Menu.Model): Model =>
    modifyFields(model, { whenMenu: () => whenMenu }),
  toParentMessage: (message: Menu.Message) =>
    Message.GotWhenMessage({ message }),
  foldOutMessage: Menu.OutMessage.match<Update.Step<Model, Message>>({
    Selected:
      ({ id }) =>
      (model) => ({
        model: isWhen(id) ? modifyFields(model, { when: () => id }) : model,
      }),
    Toggled: () => (model) => ({ model }),
  }),
});

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    CompletedDetectKeyPlatform: ({ platform }) => ({
      model: modifyFields(model, { platform: () => platform }),
    }),
    SelectedPlace: ({ place }) =>
      foldRailClose(modifyFields(model, { place: () => place })),
    SelectedTask: ({ task }) => ({
      model: modifyFields(model, {
        maybeTask: () => Option.some(task),
        paneTitle: () => task,
        when: () => "Focus",
      }),
    }),
    ToggledDone: ({ task, isDone }) => ({
      model: modifyFields(model, {
        doneTasks: (tasks) =>
          isDone
            ? Array.union(tasks, [task])
            : Array.filter(tasks, (kept) => kept !== task),
      }),
    }),
    ClickedClosePane: () => ({
      model: modifyFields(model, { maybeTask: () => Option.none() }),
    }),
    UpdatedPaneTitle: ({ value }) => ({
      model: modifyFields(model, { paneTitle: () => value }),
    }),
    PressedPaneEnter: () => ({ model }),
    ClickedProperty: () => ({ model }),
    GotWhenMessage: ({ message: menuMessage }) => foldWhen(model, menuMessage),
    GotRailMessage: ({ message: railMessage }) => foldRail(model, railMessage),
    GotStatusBarMessage: () => ({ model }),
  });

export const subscriptions = Subscription.lift(Rail.subscriptions("rail"))<
  Model,
  Message
>({
  read: (model) => Option.some(model.rail),
  toParentMessage: toRailMessage,
});

type Spot = Readonly<{
  place: Place;
  glyph?: GlyphName;
  marker?: Marker.Colour;
  count?: number;
  subPlaces?: readonly Place[];
}>;

const placesView = (
  model: Model,
  label: string,
  spots: readonly Spot[],
  h: HtmlBuilder<Message>,
  isLabelShown = false
): Html => {
  const placeOf = ({
    place,
    subPlaces = [],
    ...shown
  }: Spot): Places.Place<Message> => ({
    ...shown,
    id: place,
    label: place,
    isCurrent: model.place === place,
    onSelect: Message.SelectedPlace({ place }),
    subPlaces: Array.map(subPlaces, (subPlace) => placeOf({ place: subPlace })),
  });

  return Places.view(
    { label, isLabelShown, places: Array.map(spots, placeOf) },
    h
  );
};

const sidebarView = (model: Model, h: HtmlBuilder<Message>): Rail.Aside => ({
  head: [Wordmark.view({ label: "wtf" }, h)],
  body: [
    placesView(
      model,
      "Lists",
      [
        { place: "Inbox", glyph: "inbox", count: 5 },
        { place: "Focus", glyph: "star", count: 7 },
        { place: "Outline", glyph: "layers" },
        { place: "Someday", glyph: "archive" },
      ],
      h
    ),
    placesView(
      model,
      "Goals",
      [{ place: "Goals & values", glyph: "target" }],
      h
    ),
    placesView(
      model,
      "Areas",
      [
        {
          place: "Work",
          marker: "Amber",
          count: 6,
          subPlaces: [
            "Review budget",
            "Launch clankermem v1",
            "Ten-user beta: send invites",
          ],
        },
        { place: "Home", marker: "Sky", count: 5 },
      ],
      h,
      true
    ),
  ],
  foot: [LinkState.view({ state: "Online", label: "Synced" }, h)],
});

type Row = Readonly<{
  task: Task;
  context: Rows.ContextConfig;
  slot?: (h: HtmlBuilder<Message>) => readonly Html[];
}>;

const HOME = { label: "Home", colour: "Sky" } as const;

const WORK = { label: "Work", colour: "Amber" } as const;

const DAY_ROWS: readonly Row[] = [
  {
    task: "Quarterly taxes",
    context: {
      area: HOME,
      goals: [{ label: "Calmer home admin", colour: "Sky" }],
    },
    slot: (h) => [
      Chip.view({ label: "Overdue 15 Nov", tone: "Blocked", glyph: "flag" }, h),
    ],
  },
  {
    task: "Review budget",
    context: {
      area: WORK,
      goals: [{ label: "Ship the beta", colour: "Amber" }],
    },
    slot: (h) => [Chip.view({ label: "0/1", isFlat: true }, h)],
  },
  {
    task: "Collect receipts",
    context: { area: WORK, parent: "Review budget" },
  },
  {
    task: "Write migration guide",
    context: { area: WORK, parent: "Launch clankermem v1" },
  },
  {
    task: "Call mom",
    context: { area: HOME },
    slot: (h) => [
      Chip.view({ label: "Due today", tone: "Warn", glyph: "flag" }, h),
    ],
  },
  { task: "Draft the proposal", context: { area: WORK } },
];

const EVENING_ROWS: readonly Row[] = [
  { task: "Plan christmas trip", context: { area: HOME } },
];

const rowView = (
  model: Model,
  where: "deck" | "pane",
  row: Row,
  h: HtmlBuilder<Message>
): Html => {
  const { task } = row;
  const isDone = Array.contains(model.doneTasks, task);

  return Rows.rowView(
    {
      key: task,
      glyph: Rows.checkView(
        {
          id: `workspace-${where}-check-${task.toLowerCase().replaceAll(" ", "-")}`,
          label: task,
          isDone,
          onToggle: (next) => Message.ToggledDone({ task, isDone: next }),
        },
        h
      ),
      body: [
        Rows.titleView(
          { label: task, isDone, onOpen: Message.SelectedTask({ task }) },
          h
        ),
        Rows.contextView(row.context, h),
      ],
      slot: row.slot?.(h) ?? [],
      tools: [
        IconButton.view(
          {
            glyph: "arrow-right",
            label: `Open ${task}`,
            isQuiet: true,
            onClick: Message.SelectedTask({ task }),
          },
          h
        ),
      ],
      attributes: Option.contains(model.maybeTask, task)
        ? [h.AriaCurrent("true")]
        : [],
    },
    h
  );
};

const goalChipView = (
  label: string,
  marker: Marker.Colour,
  count: number,
  h: HtmlBuilder<Message>
): Html =>
  Chip.view(
    {
      label,
      marker: { colour: marker, kind: "Goal" },
      count,
      isLarge: true,
      href: `#${label.toLowerCase().replaceAll(" ", "-")}`,
    },
    h
  );

const doneLineView = (model: Model, h: HtmlBuilder<Message>): readonly Html[] =>
  Array.match(model.doneTasks, {
    onEmpty: () => [],
    onNonEmpty: (tasks) => [
      Rows.doneView(
        [`${tasks.length} done today · ${Array.join(tasks, ", ")}`],
        h
      ),
    ],
  });

const focusView = (model: Model, h: HtmlBuilder<Message>): readonly Html[] => [
  PageHead.view(
    {
      title: model.place,
      glyph: "star",
      meta: "Wednesday 18 November · 7 to do",
      strip: [
        goalChipView("Calmer home admin", "Sky", 1, h),
        goalChipView("Ship the beta", "Amber", 2, h),
        goalChipView("Launch clankermem v1", "Coral", 1, h),
      ],
    },
    h
  ),
  Rows.sectionView(
    {
      id: "workspace-day",
      body: [
        Rows.view(
          {
            label: "Focus",
            rows: Array.map(DAY_ROWS, (row) => rowView(model, "deck", row, h)),
          },
          h
        ),
      ],
    },
    h
  ),
  Rows.sectionView(
    {
      id: "workspace-evening",
      title: "This evening",
      glyph: "moon",
      body: [
        Rows.view(
          {
            label: "This evening",
            rows: Array.map(EVENING_ROWS, (row) =>
              rowView(model, "deck", row, h)
            ),
          },
          h
        ),
      ],
    },
    h
  ),
  ...doneLineView(model, h),
];

const WHEN_GLYPHS: Readonly<Record<When, GlyphName>> = {
  Focus: "star",
  "This evening": "moon",
  Tomorrow: "sun",
  Anytime: "layers",
  Someday: "archive",
};

const rowOf = (task: Task): Option.Option<Row> =>
  Array.findFirst([...DAY_ROWS, ...EVENING_ROWS], (row) => row.task === task);

const subtasksOf = (task: Task): readonly Task[] =>
  Array.map(
    Array.filter(
      [...DAY_ROWS, ...EVENING_ROWS],
      (row) => row.context.parent === task
    ),
    (row) => row.task
  );

const whenView = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.submodel({
    slotId: Menu.id(model.whenMenu),
    model: model.whenMenu,
    view: Menu.view,
    viewInputs: {
      label: `When, ${model.when}`,
      variant: "Quiet",
      toggleContent: [
        Glyph.view({ name: WHEN_GLYPHS[model.when] }, h),
        model.when,
      ],
      items: Array.map(When.literals, (when) =>
        Menu.radio({
          id: when,
          label: when,
          glyph: WHEN_GLYPHS[when],
          isChecked: model.when === when,
        })
      ),
    },
    toParentMessage: (message) => Message.GotWhenMessage({ message }),
  });

const propertyButton = (
  label: string,
  glyph: GlyphName,
  h: HtmlBuilder<Message>
): Html =>
  Button.view(
    { label, glyph, variant: "Quiet", onClick: Message.ClickedProperty() },
    h
  );

const paneView = (model: Model, task: Task, h: HtmlBuilder<Message>): Html => {
  const context: Rows.ContextConfig = Option.match(rowOf(task), {
    onNone: () => ({}),
    onSome: (row) => row.context,
  });

  const area = context.area ?? HOME;

  const subtasks = subtasksOf(task);
  const isDone = Array.contains(model.doneTasks, task);

  return SidePane.view(
    {
      label: "Task details",
      top: {
        context: [
          Marker.view({ colour: area.colour }, h),
          area.label,
          ...(context.parent === undefined ? [] : [`› ${context.parent}`]),
        ],
        closeLabel: "Close the details",
        onClose: Message.ClickedClosePane(),
      },
      body: [
        SidePane.titleView(
          {
            check: Rows.checkView(
              {
                id: "workspace-pane-check",
                label: task,
                isDone,
                onToggle: (next) => Message.ToggledDone({ task, isDone: next }),
              },
              h
            ),
            title: TitleField.view(
              {
                id: "workspace-pane-title",
                label: "Title",
                value: model.paneTitle,
                onInput: (value) => Message.UpdatedPaneTitle({ value }),
                onEnter: Message.PressedPaneEnter(),
              },
              h
            ),
          },
          h
        ),
        PropsList.view(
          {
            isFlat: true,
            items: [
              { label: "When", value: [whenView(model, h)] },
              { label: "Deadline", value: [propertyButton("None", "flag", h)] },
              {
                label: "Goal",
                value: [
                  propertyButton(
                    Option.match(Array.head(context.goals ?? []), {
                      onNone: () => "None",
                      onSome: (goal) => goal.label,
                    }),
                    "target",
                    h
                  ),
                ],
              },
              {
                label: "Owed to",
                value: [propertyButton("Nobody", "user", h)],
              },
            ],
          },
          h
        ),
        SidePane.notesView(
          {
            body: Option.match(Option.fromUndefinedOr(DETAILS[task]), {
              onNone: () => [],
              onSome: (details) => [h.p([], [details])],
            }),
            placeholder: "Notes, in Markdown…",
          },
          h
        ),
        Rows.sectionView(
          {
            id: "workspace-pane-subtasks",
            title: "Subtasks",
            body: [
              Rows.view(
                {
                  label: "Subtasks",
                  isCompact: true,
                  rows: Array.map(subtasks, (subtask) =>
                    rowView(model, "pane", { task: subtask, context: {} }, h)
                  ),
                },
                h
              ),
            ],
          },
          h
        ),
      ],
    },
    h
  );
};

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [],
    [
      h.submodel({
        slotId: Rail.id(model.rail),
        model: model.rail,
        view: Rail.view,
        viewInputs: {
          label: "Places",
          maybeWidth: model.maybeRailWidth,
          toAsideView: () => sidebarView(model, h),
          toDeckView: (openButton) =>
            Deck.view({ body: [openButton, ...focusView(model, h)] }, h),
          toPaneView: () =>
            Option.match(model.maybeTask, {
              onNone: () => h.empty,
              onSome: (task) => paneView(model, task, h),
            }),
        },
        toParentMessage: toRailMessage,
      }),
      StatusBar.view(
        {
          keys: [
            { keys: "J", otherKeys: ["K"], does: "move" },
            { keys: "X", does: "complete" },
            { keys: "Enter", does: "open" },
            { keys: "Q", does: "capture" },
            { keys: "W", does: "when" },
            { keys: "Mod+K", does: "commands" },
          ],
          platform: model.platform,
          toParentMessage: (message) =>
            Message.GotStatusBarMessage({ message }),
        },
        h
      ),
    ]
  );
