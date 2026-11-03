import { Format, PropsList } from "@gjermundgaraba/components";
import type { Html, HtmlBuilder } from "foldkit/html";

const CREATED_AT = new Date(Date.UTC(2026, 2, 12, 14, 5));

const percent = new Intl.NumberFormat(Format.LOCALE, { style: "percent" });

const day = new Intl.DateTimeFormat(Format.LOCALE, {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export const view = <Message>(h: HtmlBuilder<Message>): Html =>
  PropsList.view(
    {
      items: [
        { label: "Requests", value: [(41_200).toLocaleString(Format.LOCALE)] },
        { label: "Share", value: [percent.format(0.62)] },
        { label: "Created", value: [day.format(CREATED_AT)] },
      ],
    },
    h
  );
