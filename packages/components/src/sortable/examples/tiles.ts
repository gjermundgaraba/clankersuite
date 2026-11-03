import {
  Announcer,
  Group,
  LiveRegion,
  Sortable,
  Stack,
  Tag,
} from "@gjermundgaraba/components";
import { Array, Option, Schema } from "effect";
import { Subscription, Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";

const Tool = Schema.Struct({
  id: Schema.String,
  label: Schema.String,
  meta: Schema.String,
});

type Tool = typeof Tool.Type;

export const Model = Schema.Struct({
  shelf: Sortable.Model,
  tools: Schema.Array(Tool),
});

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  GotShelfMessage: { message: Sortable.Message },
  CompletedFlash: {},
});

export type Message = typeof Message.Type;

const TOOLS: readonly Tool[] = [
  { id: "notes", label: "Notes", meta: "pinned" },
  { id: "tasks", label: "Tasks", meta: "12 open" },
  { id: "calendar", label: "Calendar", meta: "today" },
  { id: "files", label: "Files", meta: "2 GB" },
  { id: "people", label: "People", meta: "48" },
];

export const init = (): Update.Return<Model, Message> => ({
  model: { shelf: Sortable.init({ id: "tool-shelf" }), tools: TOOLS },
});

const toolElementId = (toolId: string): string => `tool-${toolId}`;

const moved = (
  tools: readonly Tool[],
  toolId: string,
  toIndex: number
): readonly Tool[] =>
  Option.match(
    Array.findFirst(tools, (tool) => tool.id === toolId),
    {
      onNone: () => tools,
      onSome: (tool) =>
        Option.getOrElse(
          Array.insertAt(
            Array.filter(tools, (other) => other.id !== toolId),
            toIndex,
            tool
          ),
          () => tools
        ),
    }
  );

const foldShelf = Update.foldChild({
  update: Sortable.update,
  read: (model: Model) => Option.some(model.shelf),
  write: (model: Model, shelf: Sortable.Model): Model =>
    modifyFields(model, { shelf: () => shelf }),
  toParentMessage: (message: Sortable.Message) =>
    Message.GotShelfMessage({ message }),
  foldOutMessage: Sortable.OutMessage.match<Update.Step<Model, Message>>({
    Moved:
      ({ itemId, toIndex }) =>
      (model) => ({
        model: modifyFields(model, {
          tools: (tools) => moved(tools, itemId, toIndex),
        }),
        commands: [Announcer.Flash({ selector: `#${toolElementId(itemId)}` })],
      }),
  }),
});

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    GotShelfMessage: ({ message: shelfMessage }) =>
      foldShelf(model, shelfMessage),
    CompletedFlash: () => ({ model }),
  });

export const subscriptions = Subscription.lift(Sortable.subscriptions("shelf"))<
  Model,
  Message
>({
  read: (model) => Option.some(model.shelf),
  toParentMessage: (message) => Message.GotShelfMessage({ message }),
});

const metaOf = (tools: readonly Tool[], toolId: string): string =>
  Option.match(
    Array.findFirst(tools, (tool) => tool.id === toolId),
    { onNone: () => "", onSome: ({ meta }) => meta }
  );

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [],
    [
      h.submodel({
        slotId: "tool-shelf",
        model: model.shelf,
        view: Sortable.view,
        viewInputs: {
          items: Array.map(model.tools, ({ id, label }) => ({ id, label })),
          label: "Tools in order",
          layout: "Grid",
          toItemView: (item, render) => [
            h.div(render.isLifted ? [] : [h.Id(toolElementId(item.id))], [
              Stack.view(
                {
                  body: [
                    h.strong([], [item.label]),
                    Group.view(
                      {
                        body: [
                          Tag.view({ label: metaOf(model.tools, item.id) }, h),
                        ],
                      },
                      h
                    ),
                  ],
                },
                h
              ),
            ]),
          ],
        },
        toParentMessage: (message) => Message.GotShelfMessage({ message }),
      }),
      ...LiveRegion.place([], () => LiveRegion.view({}, h)).toPageView(),
    ]
  );
