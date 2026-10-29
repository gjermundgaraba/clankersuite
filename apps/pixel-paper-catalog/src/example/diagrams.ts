import type { Scheme } from "@gjermundgaraba/pixel-paper";
import {
  CodeSurface,
  Loading,
  Notice,
  Panel,
} from "@gjermundgaraba/pixel-paper";
import * as Mermaid from "@gjermundgaraba/pixel-paper/adapters/mermaid";
import { Option, Record, Schema } from "effect";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";
import { defineView } from "foldkit/submodel";
import type * as Update from "foldkit/update";

import { specView } from "../spec.ts";

export const Model = Schema.Struct({
  drawings: Schema.Record(Schema.String, Mermaid.Message),
});

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  GotDiagramMessage: { id: Schema.String, message: Mermaid.Message },
});

export type Message = typeof Message.Type;

export const init = (): Model => ({ drawings: {} });

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    GotDiagramMessage: ({ id, message: diagramMessage }) => ({
      model: modifyFields(model, { drawings: Record.set(id, diagramMessage) }),
    }),
  });

export type ViewInputs = Readonly<{ palette: Scheme.Palette }>;

/* SAMPLE CONTENT: made-up flows for the specimen. */

const FLOW = `flowchart LR
  accTitle: Sample sign-in
  accDescr: A request with a valid session opens the app; without one it signs in and grants access on the authorization server, then opens the app.
  request[Request arrives] --> session{Session valid?}
  session -->|yes| app[Open the app]
  session -->|no| signin[Sign in]
  subgraph server [Authorization server]
    signin --> consent[Grant access]
  end
  consent --> app`;

const SEQUENCE = `sequenceDiagram
  accTitle: Sample token refresh
  accDescr: The client calls the server with an expired token, is refused, refreshes it every five minutes, and calls again.
  participant C as Client
  participant S as Server
  C->>S: Request with token
  S-->>C: 401, token expired
  loop every 5 minutes
    C->>S: Refresh token
    S-->>C: New token
  end
  Note over C,S: Sample exchange
  C->>S: Request with new token`;

const BROKEN = `flowchart LR
  start[Start --> end`;

const diagramView = (
  model: Model,
  id: string,
  source: string,
  palette: Scheme.Palette,
  h: HtmlBuilder<Message>
): readonly Html[] => {
  const maybeDrawing = Option.filter(
    Record.get(model.drawings, id),
    (drawing) => drawing.palette === palette
  );

  const failedView = (title: string, sentence: string, reason: string): Html =>
    Notice.view(
      {
        tone: "Error",
        title,
        body: [
          sentence,
          CodeSurface.view({ label: "What mermaid said", body: [reason] }, h),
        ],
      },
      h
    );

  return [
    Loading.view(
      { isLoading: Option.isNone(maybeDrawing), label: "drawing the diagram" },
      h
    ),
    ...Option.toArray(
      Option.flatMap(maybeDrawing, (drawing) =>
        Mermaid.Message.match(drawing, {
          SucceededDrawDiagram: () => Option.none(),
          FailedLoadMermaid: ({ reason }) =>
            Option.some(
              failedView(
                "Mermaid missing",
                "Mermaid did not load, so no diagram can be drawn.",
                reason
              )
            ),
          FailedDrawDiagram: ({ reason }) =>
            Option.some(
              failedView(
                "Diagram failed",
                "Mermaid could not draw this diagram.",
                reason
              )
            ),
        })
      )
    ),
    Mermaid.view(
      {
        source,
        palette,
        toParentMessage: (message) =>
          Message.GotDiagramMessage({ id, message }),
      },
      h
    ),
  ];
};

export const view = defineView<Model, Message, ViewInputs>(
  (model, { palette }, h): Html =>
    h.div(
      [h.Class("spec-rows")],
      [
        Panel.view(
          {
            id: "diagram-sign-in",
            title: "Sign-in",
            meta: "sample",
            body: diagramView(model, "flow", FLOW, palette, h),
          },
          h
        ),
        Panel.view(
          {
            id: "diagram-token-refresh",
            title: "Token refresh",
            meta: "sample",
            body: diagramView(model, "sequence", SEQUENCE, palette, h),
          },
          h
        ),
        specView(
          "a source that does not parse: an error Notice",
          diagramView(model, "broken", BROKEN, palette, h),
          h
        ),
      ]
    )
);
