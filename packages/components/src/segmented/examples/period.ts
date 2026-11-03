import { Segmented } from "@gjermundgaraba/components";
import { Schema } from "effect";
import type { Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";

const Period = Schema.Literals(["Day", "Week", "Month"]);

type Period = typeof Period.Type;

export const Model = Schema.Struct({ period: Period });

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  SelectedPeriod: { period: Period },
});

export type Message = typeof Message.Type;

export const init = (): Update.Return<Model, Message> => ({
  model: { period: "Week" },
});

export const update = (_model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    SelectedPeriod: ({ period }) => ({ model: { period } }),
  });

const PERIODS: Segmented.ViewConfig<Period, Message>["options"] = [
  { value: "Day", label: "day" },
  { value: "Week", label: "week" },
  { value: "Month", label: "month" },
];

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  Segmented.view(
    {
      label: "Period",
      options: PERIODS,
      value: model.period,
      onSelect: (period) => Message.SelectedPeriod({ period }),
    },
    h
  );
