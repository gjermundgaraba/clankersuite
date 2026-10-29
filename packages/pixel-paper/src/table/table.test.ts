import { Scene } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { describe, it } from "vite-plus/test";

import * as Table from "./table.ts";

type Client = Readonly<{
  id: string;
  name: string;
  requests: number;
  isPaused: boolean;
}>;

const clients: readonly Client[] = [
  { id: "a", name: "Northwind", requests: 41_200, isPaused: false },
  { id: "b", name: "Contoso", requests: 12, isPaused: true },
];

const columns: ReadonlyArray<Table.Column<Client>> = [
  { key: "name", header: "Client", cell: ({ name }) => [name] },
  {
    key: "requests",
    header: "Requests",
    isNumeric: true,
    cell: ({ requests }) => [requests.toLocaleString("en")],
  },
];

describe("Table", () => {
  it("is a table in a named region whose heads are column headers and whose cells carry them", () => {
    Scene.scene(
      {
        update: (model: null) => ({ model }),
        view: (_model: null, h: HtmlBuilder<never>) =>
          Table.view(
            {
              label: "Clients",
              columns,
              rows: clients,
              rowKey: ({ id }) => id,
              actions: ({ name }) => [
                h.button([h.AriaLabel(`Edit ${name}`)], ["edit"]),
              ],
              isOff: ({ isPaused }) => isPaused,
            },
            h
          ),
      },
      Scene.given(null),
      Scene.expect(Scene.role("table")).toHaveClass("table"),
      Scene.expect(Scene.role("table")).not.toHaveAttr("aria-label"),
      Scene.expect(Scene.role("region", { name: "Clients" })).toHaveClass(
        "table-wrap"
      ),
      Scene.expectAll(Scene.all.role("columnheader")).toHaveCount(3),
      Scene.expect(Scene.role("columnheader", { name: "Client" })).toHaveAttr(
        "scope",
        "col"
      ),
      Scene.expect(
        Scene.role("columnheader", { name: "Requests" })
      ).toHaveClass("num"),
      Scene.expect(Scene.role("columnheader", { name: "Actions" })).toExist(),
      Scene.expect(Scene.role("cell", { name: "41,200" })).toHaveAttr(
        "data-label",
        "Requests"
      ),
      Scene.expect(Scene.role("button", { name: "Edit Contoso" })).toExist(),
      Scene.expect(Scene.last(Scene.all.selector("tbody tr"))).toHaveClass(
        "off"
      ),
      Scene.expect(Scene.first(Scene.all.selector("tbody tr"))).not.toHaveClass(
        "off"
      )
    );
  });

  it("has no actions column without actions", () => {
    Scene.scene(
      {
        update: (model: null) => ({ model }),
        view: (_model: null, h: HtmlBuilder<never>) =>
          Table.view(
            {
              label: "Clients",
              columns,
              rows: clients,
              rowKey: ({ id }) => id,
            },
            h
          ),
      },
      Scene.given(null),
      Scene.expectAll(Scene.all.role("columnheader")).toHaveCount(2),
      Scene.expect(Scene.selector("td.acts")).toBeAbsent()
    );
  });
});
