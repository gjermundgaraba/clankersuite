import { Prose } from "@gjermundgaraba/components";
import type { Html, HtmlBuilder } from "foldkit/html";

export const view = <Message>(h: HtmlBuilder<Message>): Html =>
  Prose.view(
    {
      body: [
        h.h2([], ["Rollout checklist"]),
        h.p(
          [],
          [
            "Body text on the reading scale, in the system sans, held to the reading measure. It is the one place the system slows down; the chrome around it stays on the working scale.",
          ]
        ),
        h.h3([], ["Before the window"]),
        h.p(
          [],
          [
            "Every release goes out in two steps. Run ",
            h.code([], ["vp run ready"]),
            " first, then switch traffic.",
          ]
        ),
      ],
    },
    h
  );
