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
}>;

const SAMPLE_CLIENTS: readonly Client[] = [
  {
    id: "4f2a",
    name: "Northwind (sample)",
    scope: "read, write",
    requests: 41_200,
  },
  {
    id: "91c0",
    name: "Contoso (sample)",
    scope: "read",
    requests: 1250,
  },
  {
    id: "7d3e",
    name: "Fabrikam (sample)",
    scope: "read",
    requests: 0,
  },
];

const columns: Table.ViewConfig<Client>["columns"] = [
  { key: "name", header: "Client", cell: ({ name }) => [name] },
  { key: "scope", header: "Scope", cell: ({ scope }) => [scope] },
  {
    key: "requests",
    header: "Requests",
    cell: ({ requests }) => [requests.toLocaleString(Format.LOCALE)],
  },
];

export const view = <Message>(h: HtmlBuilder<Message>): Html =>
  rowView(
    [
      specView(
        "a table: heads, row tools pinned",
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
