import { IconButton, PropsList } from "@gjermundgaraba/components";
import type { Html, HtmlBuilder } from "foldkit/html";

export const view = <Message>(h: HtmlBuilder<Message>): Html =>
  PropsList.view(
    {
      items: [
        { label: "Region", value: ["eu-north"] },
        {
          label: "Client id",
          value: ["4f2a-91c0"],
          isCode: true,
          actions: [
            IconButton.view(
              { glyph: "copy", label: "Copy Client id", isQuiet: true },
              h
            ),
          ],
        },
        { label: "Created", value: ["12 Mar 2026"] },
      ],
    },
    h
  );
