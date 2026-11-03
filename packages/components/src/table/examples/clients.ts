import { Format, IconButton, Table } from "@gjermundgaraba/components";
import type { Html, HtmlBuilder } from "foldkit/html";

type Client = Readonly<{
  id: string;
  name: string;
  scope: string;
  requests: number;
}>;

const CLIENTS: readonly Client[] = [
  { id: "4f2a", name: "Northwind", scope: "read, write", requests: 41_200 },
  { id: "91c0", name: "Contoso", scope: "read", requests: 1250 },
  { id: "7d3e", name: "Fabrikam", scope: "read", requests: 0 },
];

const COLUMNS: Table.ViewConfig<Client>["columns"] = [
  { key: "name", header: "Client", cell: ({ name }) => [name] },
  { key: "scope", header: "Scope", cell: ({ scope }) => [scope] },
  {
    key: "requests",
    header: "Requests",
    cell: ({ requests }) => [requests.toLocaleString(Format.LOCALE)],
  },
];

export const view = <Message>(h: HtmlBuilder<Message>): Html =>
  Table.view(
    {
      label: "Clients",
      columns: COLUMNS,
      rows: CLIENTS,
      rowKey: ({ id }) => id,
      actions: ({ name }) => [
        IconButton.view(
          { glyph: "pencil", label: `Edit ${name}`, isQuiet: true },
          h
        ),
      ],
    },
    h
  );
