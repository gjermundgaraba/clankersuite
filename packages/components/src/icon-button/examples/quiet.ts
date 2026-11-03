import { Group, IconButton } from "@gjermundgaraba/components";
import type { Html, HtmlBuilder } from "foldkit/html";

export const view = <Message>(h: HtmlBuilder<Message>): Html =>
  Group.view(
    {
      body: [
        IconButton.view(
          { glyph: "plus", label: "Add beside", isQuiet: true },
          h
        ),
        IconButton.view({ glyph: "pencil", label: "Rename", isQuiet: true }, h),
        IconButton.view({ glyph: "copy", label: "Copy", isQuiet: true }, h),
      ],
    },
    h
  );
