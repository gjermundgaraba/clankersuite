import { Prose } from "@gjermundgaraba/components";
import type { Html, HtmlBuilder } from "foldkit/html";

export const view = <Message>(h: HtmlBuilder<Message>): Html =>
  Prose.view(
    {
      body: [
        h.h2([], ["During the window"]),
        h.p(
          [],
          [
            "Roll out in batches of four, and watch each batch for five minutes before the next. Run ",
            h.code([], ["rollout status"]),
            " between batches.",
          ]
        ),
        h.blockquote(
          [],
          ["A rollback is a rollout in the other direction. Rehearse it."]
        ),
        h.h3([], ["If a node will not drain"]),
        h.ol(
          [],
          [
            h.li([], ["Take it out of the pool by hand."]),
            h.li([], ["Finish the step."]),
          ]
        ),
        h.h4([], ["Pods that hold a lock"]),
        h.p([], ["Wait out the lock's lease before you force them off."]),
        h.h5([], ["Stateful sets"]),
        h.p([], ["Drain them last, one replica at a time."]),
        h.h6([], ["Links"]),
        h.p(
          [],
          [
            "Links are ink, underlined: ",
            h.a([h.Href("#rollback")], ["the rollback plan"]),
            ".",
          ]
        ),
      ],
    },
    h
  );
