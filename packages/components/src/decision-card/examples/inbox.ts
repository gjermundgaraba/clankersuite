import {
  Button,
  Chip,
  DecisionCard,
  EmptyState,
  Marker,
  Menu,
  PageHead,
  Rows,
  Stack,
  TitleField,
} from "@gjermundgaraba/components";
import { Glyph } from "@gjermundgaraba/icons";
import type { GlyphName } from "@gjermundgaraba/icons";
import { Array, Option, Schema } from "effect";
import { Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";

type Item = Readonly<{
  id: string;
  title: string;
  source: string;
  area: Readonly<{ label: string; colour: Marker.Colour }>;
  owedTo?: string;
}>;

const WORK = { label: "Work", colour: "Amber" } as const;
const HOME = { label: "Home", colour: "Sky" } as const;
const HEALTH = { label: "Health", colour: "Coral" } as const;

const AREAS = [WORK, HOME, HEALTH] as const;

const GOALS = ["Ship the beta", "Calmer home admin"] as const;

const NO_GOAL = "No goal";

const ITEMS: readonly Item[] = [
  {
    id: "anna",
    title: "Reply to Anna about contract renewal",
    source: "You, from the desktop app · yesterday 17:40",
    area: WORK,
    owedTo: "Anna",
  },
  {
    id: "ci",
    title: "Look into flaky CI on clankerbox",
    source: "You, from the phone · today 08:12",
    area: WORK,
  },
  {
    id: "dentist",
    title: "Book dentist",
    source: "You, from the phone · today 09:30",
    area: HOME,
  },
  {
    id: "export",
    title: "Idea: export summary trees to Markdown",
    source: "You, from the desktop app · today 10:05",
    area: WORK,
  },
  {
    id: "passport",
    title: "Renew passport before March",
    source: "You, by mail · today 11:20",
    area: HOME,
  },
];

export const Model = Schema.Struct({
  decided: Schema.Int,
  title: Schema.String,
  area: Schema.String,
  goal: Schema.String,
  areaMenu: Menu.Model,
  goalMenu: Menu.Model,
  doneIds: Schema.Array(Schema.String),
});

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  UpdatedTitle: { value: Schema.String },
  PressedEnter: {},
  Decided: { where: Schema.String },
  OpenedUpNext: { id: Schema.String },
  ToggledUpNext: { id: Schema.String, isDone: Schema.Boolean },
  GotAreaMessage: { message: Menu.Message },
  GotGoalMessage: { message: Menu.Message },
});

export type Message = typeof Message.Type;

const itemAt = (index: number) =>
  Option.match(Array.get(ITEMS, index), {
    onNone: () => ({ title: "", area: "" }),
    onSome: (item) => ({ title: item.title, area: item.area.label }),
  });

export const init = (): Update.Return<Model, Message> => ({
  model: {
    decided: 0,
    ...itemAt(0),
    goal: NO_GOAL,
    areaMenu: Menu.init({ id: "inbox-area" }),
    goalMenu: Menu.init({ id: "inbox-goal" }),
    doneIds: [],
  },
});

const foldArea = Update.foldChild({
  update: Menu.update,
  read: (model: Model) => Option.some(model.areaMenu),
  write: (model: Model, areaMenu: Menu.Model): Model =>
    modifyFields(model, { areaMenu: () => areaMenu }),
  toParentMessage: (message: Menu.Message) =>
    Message.GotAreaMessage({ message }),
  foldOutMessage: Menu.OutMessage.match<Update.Step<Model, Message>>({
    Selected:
      ({ id }) =>
      (model) => ({ model: modifyFields(model, { area: () => id }) }),
    Toggled: () => (model) => ({ model }),
    PickedDay: () => (model) => ({ model }),
  }),
});

const foldGoal = Update.foldChild({
  update: Menu.update,
  read: (model: Model) => Option.some(model.goalMenu),
  write: (model: Model, goalMenu: Menu.Model): Model =>
    modifyFields(model, { goalMenu: () => goalMenu }),
  toParentMessage: (message: Menu.Message) =>
    Message.GotGoalMessage({ message }),
  foldOutMessage: Menu.OutMessage.match<Update.Step<Model, Message>>({
    Selected:
      ({ id }) =>
      (model) => ({ model: modifyFields(model, { goal: () => id }) }),
    Toggled: () => (model) => ({ model }),
    PickedDay: () => (model) => ({ model }),
  }),
});

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    UpdatedTitle: ({ value }) => ({
      model: modifyFields(model, { title: () => value }),
    }),
    PressedEnter: () => ({ model }),
    OpenedUpNext: () => ({ model }),
    ToggledUpNext: ({ id, isDone }) => ({
      model: modifyFields(model, {
        doneIds: (ids) =>
          isDone ? [...ids, id] : Array.filter(ids, (done) => done !== id),
      }),
    }),
    GotAreaMessage: ({ message: menuMessage }) => foldArea(model, menuMessage),
    GotGoalMessage: ({ message: menuMessage }) => foldGoal(model, menuMessage),
    Decided: () => {
      const next = itemAt(model.decided + 1);

      return {
        model: modifyFields(model, {
          decided: () => model.decided + 1,
          title: () => next.title,
          area: () => next.area,
          goal: () => NO_GOAL,
        }),
      };
    },
  });

const KEYS = { platform: "Other" } as const;

const DECISIONS: ReadonlyArray<
  Readonly<{ label: string; glyph: GlyphName; keys: string }>
> = [
  { label: "Focus", glyph: "star", keys: "F" },
  { label: "Pick a day", glyph: "calendar", keys: "L" },
  { label: "Anytime", glyph: "layers", keys: "N" },
  { label: "Someday", glyph: "archive", keys: "S" },
];

const decisions: ReadonlyArray<DecisionCard.Decision<Message>> = Array.map(
  DECISIONS,
  ({ label, glyph, keys }) => ({
    label,
    glyph,
    keyHint: { keys, ...KEYS },
    onDecide: Message.Decided({ where: label }),
  })
);

const colourOf = (label: string): Marker.Colour =>
  Option.match(
    Array.findFirst(AREAS, (area) => area.label === label),
    { onNone: () => WORK.colour, onSome: (area) => area.colour }
  );

const areaView = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.submodel({
    slotId: Menu.id(model.areaMenu),
    model: model.areaMenu,
    view: Menu.view,
    viewInputs: {
      label: `Area, ${model.area}`,
      variant: "Chip",
      toggleContent: [
        Marker.view({ colour: colourOf(model.area), kind: "Area" }, h),
        model.area,
      ],
      items: Array.map(AREAS, (area) =>
        Menu.radio({
          id: area.label,
          label: area.label,
          isChecked: model.area === area.label,
        })
      ),
    },
    toParentMessage: (message) => Message.GotAreaMessage({ message }),
  });

const goalView = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.submodel({
    slotId: Menu.id(model.goalMenu),
    model: model.goalMenu,
    view: Menu.view,
    viewInputs: {
      label: model.goal === NO_GOAL ? NO_GOAL : `Goal, ${model.goal}`,
      variant: "Chip",
      toggleContent: [Glyph.view({ name: "target" }, h), model.goal],
      items: Array.map([NO_GOAL, ...GOALS], (goal) =>
        Menu.radio({ id: goal, label: goal, isChecked: model.goal === goal })
      ),
    },
    toParentMessage: (message) => Message.GotGoalMessage({ message }),
  });

const cardView = (model: Model, item: Item, h: HtmlBuilder<Message>): Html =>
  DecisionCard.view(
    {
      label: model.title,
      source: { glyph: "user", text: item.source },
      title: TitleField.view(
        {
          id: "inbox-title",
          label: "Title",
          value: model.title,
          onInput: (value) => Message.UpdatedTitle({ value }),
          onEnter: Message.PressedEnter(),
        },
        h
      ),
      chips: [
        areaView(model, h),
        goalView(model, h),
        ...(item.owedTo === undefined
          ? []
          : [Chip.view({ label: `Owed to ${item.owedTo}`, glyph: "user" }, h)]),
      ],
      decisions,
      lead: [
        Button.view(
          {
            label: "Delete",
            glyph: "trash",
            variant: "Ghost",
            keyHint: { keys: "D", ...KEYS },
            onClick: Message.Decided({ where: "Deleted" }),
          },
          h
        ),
      ],
      actions: [
        Button.view(
          {
            label: "Skip for now",
            variant: "Ghost",
            keyHint: { keys: "J", ...KEYS },
            onClick: Message.Decided({ where: "Skipped" }),
          },
          h
        ),
      ],
    },
    h
  );

const upNextView = (
  model: Model,
  rest: readonly Item[],
  h: HtmlBuilder<Message>
): Html =>
  Rows.sectionView(
    {
      id: "inbox-up-next",
      title: "Up next",
      count: rest.length,
      body: [
        Rows.view(
          {
            isDimmed: true,
            rows: Array.map(rest, (item) =>
              Rows.rowView(
                {
                  key: item.id,
                  glyph: Rows.checkView(
                    {
                      id: `inbox-${item.id}-check`,
                      label: item.title,
                      isDone: Array.contains(model.doneIds, item.id),
                      onToggle: (isDone) =>
                        Message.ToggledUpNext({ id: item.id, isDone }),
                    },
                    h
                  ),
                  body: [
                    Rows.titleView(
                      {
                        label: item.title,
                        onOpen: Message.OpenedUpNext({ id: item.id }),
                      },
                      h
                    ),
                    Rows.contextView({ area: item.area }, h),
                  ],
                },
                h
              )
            ),
          },
          h
        ),
      ],
    },
    h
  );

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  Option.match(Array.get(ITEMS, model.decided), {
    onNone: () =>
      EmptyState.view(
        {
          title: "Inbox zero",
          headingLevel: 2,
          glyph: "inbox",
          body: ["Everything has a place. New captures land here."],
        },
        h
      ),
    onSome: (item) =>
      Stack.view(
        {
          gap: "L",
          body: [
            PageHead.view(
              {
                title: "Inbox",
                glyph: "inbox",
                meta: "One task at a time. Decide where it goes, and it leaves the Inbox.",
              },
              h
            ),
            DecisionCard.progressView(
              {
                id: "inbox-progress",
                label: "Through the Inbox",
                position: model.decided + 1,
                total: ITEMS.length,
              },
              h
            ),
            cardView(model, item, h),
            upNextView(model, Array.drop(ITEMS, model.decided + 1), h),
          ],
        },
        h
      ),
  });
