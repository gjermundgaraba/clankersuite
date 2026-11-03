import { MarkdownEditor } from "@gjermundgaraba/components";
import type { Html, HtmlBuilder } from "foldkit/html";

const DESCRIPTION = [
  "## Why",
  "",
  "Run the **spring half marathon** under two hours, so the autumn one can aim lower.",
  "",
  "- [x] Book the [race](https://example.com/race)",
  "- [ ] Long run every _Sunday_",
  "- [ ] Taper the last week",
  "",
  "> Easy days easy, hard days hard.",
].join("\n");

export const view = <Message>(h: HtmlBuilder<Message>): Html =>
  MarkdownEditor.readView(
    {
      value: DESCRIPTION,
      attributes: [h.AriaLabel("Description")],
    },
    h
  );
