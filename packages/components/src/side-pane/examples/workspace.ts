import {
  Button,
  Chip,
  ConfirmDialog,
  Deck,
  Focus,
  Format,
  IconButton,
  InlineInput,
  KeyHint,
  LinkState,
  Marker,
  MarkdownEditor,
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
  paneNotes: Schema.String,
  whenMenu: Menu.Model,
  when: When,
  whenDay: Schema.String,
  deadline: Schema.String,
  owedTo: Schema.String,
  maybeOwedTo: Schema.Option(InlineInput.Model),
  moreMenu: Menu.Model,
  deleteConfirm: ConfirmDialog.Model,
  deletedTasks: Schema.Array(Task),
});

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  CompletedDetectKeyPlatform: { platform: KeyHint.KeyPlatform },
  SelectedPlace: { place: Place },
  SelectedTask: { task: Task },
  ToggledDone: { task: Task, isDone: Schema.Boolean },
  ClickedClosePane: {},
  UpdatedPaneTitle: { value: Schema.String },
  UpdatedPaneNotes: { value: Schema.String },
  PressedPaneEnter: {},
  ClickedProperty: {},
  ChangedDeadline: { value: Schema.String },
  ClickedOwedTo: {},
  CompletedFocus: {},
  GotWhenMessage: { message: Menu.Message },
  GotMoreMessage: { message: Menu.Message },
  GotOwedToMessage: { message: InlineInput.Message },
  GotPropsListMessage: { message: PropsList.Message },
  GotRailMessage: { message: Rail.Message },
  GotStatusBarMessage: { message: StatusBar.Message },
  GotSidePaneMessage: { message: SidePane.Message },
  GotTitleFieldMessage: { message: TitleField.Message },
  GotDeleteConfirmMessage: { message: ConfirmDialog.Message },
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
    maybeTask: Option.some("Call mom"),
    doneTasks: ["Answer Lars about the offsite"],
    paneTitle: "Call mom",
    paneNotes: "",
    whenMenu: Menu.init({ id: "workspace-when" }),
    when: "Focus",
    whenDay: "",
    deadline: "",
    owedTo: "",
    maybeOwedTo: Option.none(),
    moreMenu: Menu.init({ id: "workspace-more" }),
    deleteConfirm: ConfirmDialog.init({ id: "workspace-delete" }),
    deletedTasks: [],
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

const OWED_TO_ID = "workspace-owed-to";
const OWED_TO_BUTTON_ID = "workspace-owed-to-button";

const owedToFold = {
  read: (model: Model) => model.maybeOwedTo,
  write: (model: Model, owedTo: InlineInput.Model): Model =>
    modifyFields(model, { maybeOwedTo: () => Option.some(owedTo) }),
  toParentMessage: (message: InlineInput.Message) =>
    Message.GotOwedToMessage({ message }),
};

const endOwedTo =
  ({ how }: typeof InlineInput.OutMessage.Ended.Type) =>
  (model: Model): Update.Return<Model, Message> => {
    const ended = modifyFields(model, { maybeOwedTo: () => Option.none() });

    return how === "Blur"
      ? { model: ended }
      : { model: ended, commands: [Focus.Focus({ id: OWED_TO_BUTTON_ID })] };
  };

const foldOwedToSaved = Update.foldChild({
  update: InlineInput.succeeded,
  ...owedToFold,
  foldOutMessage: InlineInput.OutMessage.match<Update.Step<Model, Message>>({
    Committed: () => (model) => ({ model }),
    Ended: endOwedTo,
  }),
});

const foldOwedTo = Update.foldChild({
  update: InlineInput.update,
  ...owedToFold,
  foldOutMessage: InlineInput.OutMessage.match<Update.Step<Model, Message>>({
    Committed:
      ({ text }) =>
      (model) =>
        foldOwedToSaved(
          modifyFields(model, { owedTo: () => text }),
          OWED_TO_ID
        ),
    Ended: endOwedTo,
  }),
});

const startOwedTo = (model: Model): Update.Return<Model, Message> =>
  Update.foldChildInit(InlineInput.init({ id: OWED_TO_ID }), {
    toParentModel: (owedTo) =>
      modifyFields(model, { maybeOwedTo: () => Option.some(owedTo) }),
    toParentMessage: (message) => Message.GotOwedToMessage({ message }),
  });

const deleteConfirmFold = {
  read: (model: Model) => Option.some(model.deleteConfirm),
  write: (model: Model, deleteConfirm: ConfirmDialog.Model): Model =>
    modifyFields(model, { deleteConfirm: () => deleteConfirm }),
  toParentMessage: (message: ConfirmDialog.Message) =>
    Message.GotDeleteConfirmMessage({ message }),
};

const openDeleteConfirm = Update.foldChildStep({
  update: ConfirmDialog.open,
  ...deleteConfirmFold,
});

const closeDeleteConfirm = Update.foldChildStep({
  update: ConfirmDialog.close,
  ...deleteConfirmFold,
});

const deleteTask = (model: Model): Model =>
  Option.match(model.maybeTask, {
    onNone: () => model,
    onSome: (task) =>
      modifyFields(model, {
        deletedTasks: (tasks) => Array.union(tasks, [task]),
        maybeTask: () => Option.none(),
      }),
  });

const foldDeleteConfirm = Update.foldChild({
  update: ConfirmDialog.update,
  ...deleteConfirmFold,
  foldOutMessage: ConfirmDialog.OutMessage.match<Update.Step<Model, Message>>({
    Confirmed: () => (model) => closeDeleteConfirm(deleteTask(model)),
    Cancelled: () => (model) => ({ model }),
  }),
});

const foldMore = Update.foldChild({
  update: Menu.update,
  read: (model: Model) => Option.some(model.moreMenu),
  write: (model: Model, moreMenu: Menu.Model): Model =>
    modifyFields(model, { moreMenu: () => moreMenu }),
  toParentMessage: (message: Menu.Message) =>
    Message.GotMoreMessage({ message }),
  foldOutMessage: Menu.OutMessage.match<Update.Step<Model, Message>>({
    Selected:
      ({ id }) =>
      (model) =>
        id === "delete"
          ? openDeleteConfirm(model)
          : {
              model: Option.match(model.maybeTask, {
                onNone: () => model,
                onSome: (task) =>
                  id === "done"
                    ? modifyFields(model, {
                        doneTasks: (tasks) => Array.union(tasks, [task]),
                      })
                    : model,
              }),
            },
    Toggled: () => (model) => ({ model }),
    PickedDay: () => (model) => ({ model }),
  }),
});

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
        model: isWhen(id)
          ? modifyFields(model, { when: () => id, whenDay: () => "" })
          : model,
      }),
    Toggled: () => (model) => ({ model }),
    PickedDay:
      ({ value }) =>
      (model) => ({
        model: modifyFields(model, { whenDay: () => value }),
      }),
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
        paneNotes: () => DETAILS[task] ?? "",
        when: () => "Focus",
        whenDay: () => "",
        deadline: () => "",
        owedTo: () => "",
        maybeOwedTo: () => Option.none(),
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
    UpdatedPaneNotes: ({ value }) => ({
      model: modifyFields(model, { paneNotes: () => value }),
    }),
    PressedPaneEnter: () => ({ model }),
    ClickedProperty: () => ({ model }),
    ChangedDeadline: ({ value }) => ({
      model: modifyFields(model, { deadline: () => value }),
      commands: [Focus.Focus({ id: "workspace-pane-deadline-button" })],
    }),
    ClickedOwedTo: () => startOwedTo(model),
    CompletedFocus: () => ({ model }),
    GotWhenMessage: ({ message: menuMessage }) => foldWhen(model, menuMessage),
    GotMoreMessage: ({ message: menuMessage }) => foldMore(model, menuMessage),
    GotOwedToMessage: ({ message: owedToMessage }) =>
      foldOwedTo(model, owedToMessage),
    GotPropsListMessage: () => ({ model }),
    GotRailMessage: ({ message: railMessage }) => foldRail(model, railMessage),
    GotStatusBarMessage: () => ({ model }),
    GotSidePaneMessage: () => ({ model }),
    GotTitleFieldMessage: () => ({ model }),
    GotDeleteConfirmMessage: ({ message: confirmMessage }) =>
      foldDeleteConfirm(model, confirmMessage),
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

const isDeleted = (model: Model, task: string): boolean =>
  Array.some(model.deletedTasks, (deleted) => deleted === task);

const shownRows = (model: Model, rows: readonly Row[]): readonly Row[] =>
  Array.filter(
    rows,
    (row) =>
      !isDeleted(model, row.task) &&
      (row.context.parent === undefined ||
        !isDeleted(model, row.context.parent))
  );

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
            rows: Array.map(shownRows(model, DAY_ROWS), (row) =>
              rowView(model, "deck", row, h)
            ),
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
            rows: Array.map(shownRows(model, EVENING_ROWS), (row) =>
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

const propertyButton = (
  label: string,
  glyph: GlyphName,
  h: HtmlBuilder<Message>
): Html =>
  Button.view(
    { label, glyph, variant: "Quiet", onClick: Message.ClickedProperty() },
    h
  );

const THIS_YEAR = 2026;

const dayOf = (withYear: boolean) =>
  new Intl.DateTimeFormat(Format.LOCALE, {
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(withYear && { year: "numeric" }),
    timeZone: "UTC",
  });

const deadlineShown = (deadline: string): string => {
  if (deadline === "") {
    return "None";
  }

  const day = new Date(`${deadline}T00:00:00Z`);

  return dayOf(day.getUTCFullYear() !== THIS_YEAR).format(day);
};

const whenShown = (model: Model): string =>
  model.whenDay === "" ? model.when : deadlineShown(model.whenDay);

const whenView = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.submodel({
    slotId: Menu.id(model.whenMenu),
    model: model.whenMenu,
    view: Menu.view,
    viewInputs: {
      label: `When, ${whenShown(model)}`,
      variant: "Quiet",
      toggleContent: [
        Glyph.view(
          { name: model.whenDay === "" ? WHEN_GLYPHS[model.when] : "calendar" },
          h
        ),
        whenShown(model),
      ],
      items: [
        ...Array.map(When.literals, (when) =>
          Menu.radio({
            id: when,
            label: when,
            glyph: WHEN_GLYPHS[when],
            isChecked: model.whenDay === "" && model.when === when,
          })
        ),
        Menu.separator("day"),
        Menu.day({
          id: "pick-day",
          label: "Pick a day…",
          glyph: "calendar",
          value: model.whenDay,
        }),
      ],
    },
    toParentMessage: (message) => Message.GotWhenMessage({ message }),
  });

const owedToView = (model: Model, h: HtmlBuilder<Message>): Html =>
  Option.match(model.maybeOwedTo, {
    onNone: () =>
      Button.view(
        {
          label: model.owedTo === "" ? "Nobody" : model.owedTo,
          glyph: "user",
          variant: "Quiet",
          onClick: Message.ClickedOwedTo(),
          attributes: [h.Id(OWED_TO_BUTTON_ID)],
        },
        h
      ),
    onSome: (owedTo) =>
      h.submodel({
        slotId: OWED_TO_ID,
        model: owedTo,
        view: InlineInput.view,
        viewInputs: {
          value: model.owedTo,
          label: "Owed to",
          placeholder: "Who it is owed to",
        },
        toParentMessage: (message) => Message.GotOwedToMessage({ message }),
      }),
  });

const moreView = (model: Model, task: Task, h: HtmlBuilder<Message>): Html =>
  h.submodel({
    slotId: Menu.id(model.moreMenu),
    model: model.moreMenu,
    view: Menu.view,
    viewInputs: {
      label: `More for ${task}`,
      glyph: "more",
      variant: "Quiet",
      align: "End",
      items: [
        Menu.action({ id: "done", label: "Mark done", glyph: "check" }),
        Menu.action({ id: "archive", label: "Archive", glyph: "archive" }),
        Menu.separator("danger"),
        Menu.action({
          id: "delete",
          label: "Delete with its subtasks",
          glyph: "trash",
        }),
      ],
    },
    toParentMessage: (message) => Message.GotMoreMessage({ message }),
  });

const paneView = (model: Model, task: Task, h: HtmlBuilder<Message>): Html => {
  const context: Rows.ContextConfig = Option.match(rowOf(task), {
    onNone: () => ({}),
    onSome: (row) => row.context,
  });

  const area = context.area ?? HOME;

  const subtasks = Array.filter(
    subtasksOf(task),
    (subtask) => !isDeleted(model, subtask)
  );

  const isDone = Array.contains(model.doneTasks, task);

  return SidePane.view(
    {
      label: "Task details",
      onEscape: Message.ClickedClosePane(),
      toParentMessage: (message) => Message.GotSidePaneMessage({ message }),
      top: {
        context: [
          Marker.view({ colour: area.colour }, h),
          area.label,
          ...(context.parent === undefined ? [] : [`› ${context.parent}`]),
        ],
        menu: moreView(model, task, h),
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
                toParentMessage: (message) =>
                  Message.GotTitleFieldMessage({ message }),
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
              {
                label: "Deadline",
                value: [
                  PropsList.dateView(
                    {
                      id: "workspace-pane-deadline",
                      label: "Deadline",
                      value: model.deadline,
                      shown: deadlineShown(model.deadline),
                      glyph: "flag",
                      onChange: (value) => Message.ChangedDeadline({ value }),
                      toParentMessage: (message) =>
                        Message.GotPropsListMessage({ message }),
                    },
                    h
                  ),
                ],
              },
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
              { label: "Owed to", value: [owedToView(model, h)] },
            ],
          },
          h
        ),
        SidePane.notesView(
          {
            body: [
              MarkdownEditor.view(
                {
                  id: "workspace-pane-notes",
                  label: "Notes",
                  isLabelHidden: true,
                  value: model.paneNotes,
                  onInput: (value) => Message.UpdatedPaneNotes({ value }),
                  rows: 1,
                  placeholder: "Notes, in Markdown…",
                },
                h
              ),
            ],
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

const deleteConfirmView = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.submodel({
    slotId: ConfirmDialog.id(model.deleteConfirm),
    model: model.deleteConfirm,
    view: ConfirmDialog.view,
    viewInputs: {
      title: "Delete",
      question: `Delete ${Option.getOrElse(model.maybeTask, () => "this task")}?`,
      body: ["Its subtasks go with it, and it cannot be undone."],
      label: "Delete",
      isDanger: true,
    },
    toParentMessage: (message) => Message.GotDeleteConfirmMessage({ message }),
  });

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
            Deck.view(
              {
                body: [
                  openButton,
                  ...focusView(model, h),
                  deleteConfirmView(model, h),
                ],
              },
              h
            ),
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
