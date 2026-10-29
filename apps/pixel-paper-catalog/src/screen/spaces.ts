import {
  Announcer,
  Button,
  Card,
  Chip,
  EmptyState,
  Identity,
  LinkButton,
  Notice,
  Rows,
  TextButton,
  Wall,
} from "@gjermundgaraba/pixel-paper";
import { Array, Schema } from "effect";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";
import { defineView } from "foldkit/submodel";
import type * as Update from "foldkit/update";

import { screenUrl } from "../route.ts";
import { ROOMS } from "../sample.ts";
import type { Room } from "../sample.ts";
import { brandView } from "../spec.ts";

export const Model = Schema.Struct({ isEmpty: Schema.Boolean });

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  ClickedSwitch: {},
  ClickedNewSpace: {},
  CompletedAnnounce: {},
});

export type Message = typeof Message.Type;

export const init = (): Model => ({ isEmpty: false });

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    ClickedSwitch: () => ({
      model: modifyFields(model, { isEmpty: (isEmpty) => !isEmpty }),
    }),
    ClickedNewSpace: () => ({
      model,
      commands: [Announcer.Announce({ text: "Sample: no space was made." })],
    }),
    CompletedAnnounce: () => ({ model }),
  });

const roomRow = (room: Room, h: HtmlBuilder<Message>): Html =>
  Rows.rowView(
    {
      key: room.id,
      body: [Identity.view({ label: room.name, meta: [room.meta] }, h)],
      slot: [
        room.isLive
          ? Chip.view({ label: "live", tone: "Go" }, h)
          : Chip.view({ label: "idle" }, h),
      ],
      actions: [
        LinkButton.view(
          {
            label: `enter ${room.name}`,
            href: screenUrl("stage"),
            isSmall: true,
          },
          h
        ),
      ],
    },
    h
  );

const roomsView = (rooms: readonly Room[], h: HtmlBuilder<Message>): Html =>
  Array.match(rooms, {
    onEmpty: () =>
      EmptyState.view(
        {
          title: "No spaces yet",
          headingLevel: 3,
          body: [
            "A space is where people work on one thing together. Make one, then share its address.",
          ],
          actions: [
            Button.view(
              {
                label: "make the first",
                glyph: "plus",
                isSmall: true,
                onClick: Message.ClickedNewSpace(),
              },
              h
            ),
          ],
        },
        h
      ),
    onNonEmpty: (present) =>
      Rows.view(
        {
          label: "Spaces",
          rows: Array.map(present, (room) => roomRow(room, h)),
        },
        h
      ),
  });

export const view = defineView<Model, Message>((model, h): Html => {
  const rooms = model.isEmpty ? [] : ROOMS;
  const live = Array.filter(rooms, ({ isLive }) => isLive).length;

  return Card.view(
    {
      title: "Spaces",
      meta: Array.isReadonlyArrayNonEmpty(rooms)
        ? `${live} live · ${rooms.length}`
        : "none yet",
      lead: [
        TextButton.view(
          {
            label: `show: ${model.isEmpty ? "sample spaces" : "no spaces"}`,
            onClick: Message.ClickedSwitch(),
          },
          h
        ),
      ],
      actions: Array.isReadonlyArrayNonEmpty(rooms)
        ? [
            Button.view(
              {
                label: "new space",
                glyph: "plus",
                onClick: Message.ClickedNewSpace(),
              },
              h
            ),
          ]
        : [],
      body: [
        Wall.markView({ brand: brandView(h) }, h),
        roomsView(rooms, h),
        Notice.view(
          {
            tone: "Quiet",
            body: [
              "Sample spaces: none of them exist, and entering one opens the sample stage.",
            ],
          },
          h
        ),
      ],
    },
    h
  );
});
