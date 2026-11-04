import { PropsList, Time } from "@gjermundgaraba/components";
import type { Html, HtmlBuilder } from "foldkit/html";

export const view = <Message>(h: HtmlBuilder<Message>): Html =>
  PropsList.view(
    {
      items: [
        {
          label: "Wakes",
          value: [
            Time.dayView(
              { day: "2026-03-16", label: "wakes Mon", format: "Age" },
              h
            ),
          ],
        },
        {
          label: "Due",
          value: [
            Time.dayView(
              { day: "2026-03-13", label: "due Fri", format: "Until" },
              h
            ),
          ],
        },
        {
          label: "Overdue",
          value: [
            Time.dayView(
              {
                day: "2026-03-10",
                label: "due Tue",
                format: "Until",
                isLate: true,
              },
              h
            ),
          ],
        },
      ],
    },
    h
  );
