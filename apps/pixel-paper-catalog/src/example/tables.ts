import {
  Format,
  IconButton,
  PropsList,
  Table,
} from "@gjermundgaraba/pixel-paper";
import type { Html, HtmlBuilder } from "foldkit/html";

import { rowView, specView } from "../spec.ts";

// SAMPLE

type Client = Readonly<{
  id: string;
  name: string;
  scope: string;
  requests: number;
  isPaused: boolean;
}>;

const SAMPLE_CLIENTS: readonly Client[] = [
  {
    id: "4f2a",
    name: "Northwind (sample)",
    scope: "read, write",
    requests: 41_200,
    isPaused: false,
  },
  {
    id: "91c0",
    name: "Contoso (sample)",
    scope: "read",
    requests: 1250,
    isPaused: false,
  },
  {
    id: "7d3e",
    name: "Fabrikam (sample)",
    scope: "read",
    requests: 0,
    isPaused: true,
  },
];

const columns: ReadonlyArray<Table.Column<Client>> = [
  { key: "name", header: "Client", cell: ({ name }) => [name] },
  { key: "scope", header: "Scope", cell: ({ scope }) => [scope] },
  {
    key: "requests",
    header: "Requests",
    isNumeric: true,
    cell: ({ requests }) => [requests.toLocaleString(Format.LOCALE)],
  },
];

export const view = <Message>(h: HtmlBuilder<Message>): Html =>
  rowView(
    [
      specView(
        "a table: heads, numbers right, row tools pinned, a paused row muted",
        [
          Table.view(
            {
              label: "Clients (sample)",
              columns,
              rows: SAMPLE_CLIENTS,
              rowKey: ({ id }) => id,
              actions: ({ name }) => [
                IconButton.view(
                  {
                    glyph: "pencil",
                    label: `Edit ${name}`,
                    isQuiet: true,
                    attributes: [h.Inert(true)],
                  },
                  h
                ),
              ],
              isOff: ({ isPaused }) => isPaused,
            },
            h
          ),
        ],
        h
      ),
      specView(
        "properties: a label, the value, its controls",
        [
          PropsList.view(
            {
              items: [
                { label: "Region", value: ["eu-north (sample)"] },
                {
                  label: "Client id",
                  value: ["4f2a-sample"],
                  isCode: true,
                  actions: [
                    IconButton.view(
                      {
                        glyph: "copy",
                        label: "Copy Client id",
                        isQuiet: true,
                        attributes: [h.Inert(true)],
                      },
                      h
                    ),
                  ],
                },
                { label: "Created", value: ["12 Mar 2026"] },
              ],
            },
            h
          ),
        ],
        h
      ),
    ],
    h
  );
