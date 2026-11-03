import { PropsList, Time } from "@gjermundgaraba/components";
import { Option } from "effect";
import type { Html, HtmlBuilder } from "foldkit/html";

const RELEASED_AT = Date.UTC(2026, 2, 12, 14, 5);

export const view = <Message>(h: HtmlBuilder<Message>): Html =>
  PropsList.view(
    {
      items: [
        {
          label: "Age",
          value: [Time.view({ at: RELEASED_AT, maybeNow: Option.none() }, h)],
        },
        {
          label: "Date",
          value: [
            Time.view(
              { at: RELEASED_AT, format: "Date", maybeNow: Option.none() },
              h
            ),
          ],
        },
      ],
    },
    h
  );
