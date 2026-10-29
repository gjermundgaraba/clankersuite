import {
  Chip,
  FilterChip,
  FilterStrip,
  Mark,
  QueryChip,
  Tag,
} from "@gjermundgaraba/pixel-paper";
import { Schema } from "effect";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";
import { defineView } from "foldkit/submodel";
import type * as Update from "foldkit/update";

import { rowView, specView } from "../spec.ts";

export const Model = Schema.Struct({
  isOpenOnly: Schema.Boolean,
  isDueSoon: Schema.Boolean,
  query: Schema.String,
  isFlagged: Schema.Boolean,
});

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  ToggledOpenOnly: {},
  ToggledDueSoon: {},
  UpdatedQuery: { value: Schema.String },
  ClickedReset: {},
  ToggledFlag: {},
});

export type Message = typeof Message.Type;

export const init = (): Model => ({
  isOpenOnly: true,
  isDueSoon: false,
  query: "",
  isFlagged: false,
});

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    ToggledOpenOnly: () => ({
      model: modifyFields(model, { isOpenOnly: (isOn) => !isOn }),
    }),
    ToggledDueSoon: () => ({
      model: modifyFields(model, { isDueSoon: (isOn) => !isOn }),
    }),
    UpdatedQuery: ({ value }) => ({
      model: modifyFields(model, { query: () => value }),
    }),
    ClickedReset: () => ({
      model: modifyFields(model, {
        isOpenOnly: () => false,
        isDueSoon: () => false,
        query: () => "",
      }),
    }),
    ToggledFlag: () => ({
      model: modifyFields(model, { isFlagged: (isOn) => !isOn }),
    }),
  });

const stripView = (model: Model, h: HtmlBuilder<Message>): Html =>
  FilterStrip.view(
    {
      body: [
        FilterChip.view(
          {
            label: "open",
            isPressed: model.isOpenOnly,
            onToggle: Message.ToggledOpenOnly(),
          },
          h
        ),
        FilterChip.view(
          {
            label: "this week",
            isPressed: model.isDueSoon,
            onToggle: Message.ToggledDueSoon(),
          },
          h
        ),
        FilterChip.view({ label: "mine", isPressed: true }, h),
        QueryChip.view(
          {
            id: "sample-query",
            label: "find",
            value: model.query,
            onInput: (value) => Message.UpdatedQuery({ value }),
            placeholder: "words in a title",
          },
          h
        ),
        h.span([h.Class("spacer")]),
        FilterChip.view(
          {
            label: "reset",
            full: "Reset the filters",
            isReset: true,
            onToggle: Message.ClickedReset(),
          },
          h
        ),
      ],
    },
    h
  );

export const view = defineView<Model, Message>((model, h): Html =>
  h.div(
    [h.Class("spec-rows")],
    [
      rowView(
        [
          specView(
            "a filter strip: toggles, a pinned filter, a query, a reset read in full",
            [stripView(model, h)],
            h
          ),
        ],
        h
      ),
      rowView(
        [
          specView(
            "chips: a state word in its tone",
            [
              h.span(
                [h.Class("spec-inline")],
                [
                  Chip.view({ label: "draft" }, h),
                  Chip.view({ label: "live", tone: "Go" }, h),
                  Chip.view({ label: "late", tone: "Warn" }, h),
                  Chip.view({ label: "blocked", tone: "Blocked" }, h),
                  Chip.view({ label: "done", tone: "Done" }, h),
                  Chip.view({ label: "building", isBusy: true }, h),
                ]
              ),
            ],
            h
          ),
          specView(
            "chip dots: the state as a cell, the word its name and its tip",
            [
              h.span(
                [h.Class("spec-inline")],
                [
                  Chip.dotView({ label: "draft" }, h),
                  Chip.dotView({ label: "live", tone: "Go" }, h),
                  Chip.dotView({ label: "late", tone: "Warn" }, h),
                  Chip.dotView({ label: "blocked", tone: "Blocked" }, h),
                  Chip.dotView({ label: "done", tone: "Done" }, h),
                ]
              ),
            ],
            h
          ),
          specView(
            "marks: this one needs attention",
            [
              h.span(
                [h.Class("spec-inline")],
                [
                  Mark.view({ label: "Needs attention" }, h),
                  Mark.view({ label: "Marked", isPlain: true }, h),
                  Mark.view(
                    {
                      label: "Flag",
                      isPressed: model.isFlagged,
                      onToggle: Message.ToggledFlag(),
                    },
                    h
                  ),
                ]
              ),
            ],
            h
          ),
          specView(
            "tags: counts and scopes, read in full",
            [
              h.span(
                [h.Class("spec-inline")],
                [
                  Tag.view({ label: "ops" }, h),
                  Tag.view({ label: "3", full: "3 in Operations" }, h),
                ]
              ),
            ],
            h
          ),
        ],
        h
      ),
    ]
  )
);
