import { Array, Schema } from "effect";
import { Scene } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";
import type * as Update from "foldkit/update";
import { describe, it } from "vite-plus/test";

import * as Chip from "../chip/chip.ts";
import * as Rows from "./rows.ts";

const Model = Schema.Struct({
  selectedIds: Schema.Array(Schema.String),
  isExpanded: Schema.Boolean,
});

type Model = typeof Model.Type;

const Message = defineMessageUnion({
  ToggledRow: { id: Schema.String, isChecked: Schema.Boolean },
  ClickedFold: {},
  ClickedOpen: { id: Schema.String },
});

type Message = typeof Message.Type;

const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    ToggledRow: ({ id, isChecked }) => ({
      model: modifyFields(model, {
        selectedIds: (ids) =>
          isChecked ? [...ids, id] : Array.filter(ids, (kept) => kept !== id),
      }),
    }),
    ClickedFold: () => ({
      model: modifyFields(model, { isExpanded: (isExpanded) => !isExpanded }),
    }),
    ClickedOpen: () => ({ model }),
  });

const view = (model: Model, h: HtmlBuilder<Message>) =>
  Rows.view(
    {
      label: "Tasks",
      isOutline: true,
      rows: [
        Rows.rowView(
          {
            key: "notes",
            glyph: Rows.toggleView(
              {
                isExpanded: model.isExpanded,
                label: "Notes",
                onToggle: Message.ClickedFold(),
              },
              h
            ),
            body: ["Write the notes"],
            select: {
              id: "row-notes",
              isChecked: Array.contains(model.selectedIds, "notes"),
              onToggle: (isChecked) =>
                Message.ToggledRow({ id: "notes", isChecked }),
            },
            slot: [h.span([h.Class("chip")], ["open"])],
            slotAttributes: [h.Id("notes-slot")],
            attributes: [h.AriaDescribedBy("notes-slot")],
            nested: model.isExpanded
              ? [
                  Rows.rowView(
                    {
                      key: "room",
                      glyph: Rows.glyphView({ name: "ring" }, h),
                      body: ["Book the room"],
                    },
                    h
                  ),
                ]
              : [],
          },
          h
        ),
        Rows.rowView(
          {
            key: "drafts",
            body: [
              Rows.titleView(
                {
                  label: "Archive the drafts",
                  onOpen: Message.ClickedOpen({ id: "drafts" }),
                  isDone: true,
                },
                h
              ),
            ],
            select: {
              id: "row-drafts",
              isChecked: Array.contains(model.selectedIds, "drafts"),
              onToggle: (isChecked) =>
                Message.ToggledRow({ id: "drafts", isChecked }),
              label: "Select Archive the drafts",
            },
          },
          h
        ),
      ],
    },
    h
  );

const notesBox = Scene.role("checkbox", { name: "Write the notes" });
const draftsBox = Scene.role("checkbox", { name: "Select Archive the drafts" });

describe("Rows", () => {
  it("is a named list whose row text labels the row's box, and toggles it", () => {
    Scene.scene(
      { update, view },
      Scene.given({ selectedIds: [], isExpanded: false }),
      Scene.expect(Scene.role("list", { name: "Tasks" })).toHaveClass("tree"),
      Scene.expect(notesBox).toHaveAttr("aria-checked", "false"),
      Scene.click(notesBox),
      Scene.expect(notesBox).toHaveAttr("aria-checked", "true"),
      Scene.click(Scene.selector("label.grow")),
      Scene.expect(notesBox).toHaveAttr("aria-checked", "false")
    );
  });

  it("names a box whose text is a button, and leaves the text out of the toggle", () => {
    Scene.scene(
      { update, view },
      Scene.given({ selectedIds: [], isExpanded: false }),
      Scene.expect(draftsBox).toHaveAttr("aria-checked", "false"),
      Scene.expect(
        Scene.role("button", { name: "Archive the drafts" })
      ).toHaveClass("done-title"),
      Scene.click(Scene.role("button", { name: "Archive the drafts" })),
      Scene.expect(draftsBox).toHaveAttr("aria-checked", "false"),
      Scene.click(draftsBox),
      Scene.expect(draftsBox).toHaveAttr("aria-checked", "true")
    );
  });

  it("folds and unfolds under one name, aria-expanded saying which", () => {
    const toggle = Scene.role("button", { name: "Rows under Notes" });
    Scene.scene(
      { update, view },
      Scene.given({ selectedIds: [], isExpanded: false }),
      Scene.expect(toggle).toHaveAttr("aria-expanded", "false"),
      Scene.expect(Scene.selector("li li")).toBeAbsent(),
      Scene.click(toggle),
      Scene.expect(toggle).toHaveAttr("aria-expanded", "true"),
      Scene.expect(Scene.selector("li ul.rows li .row")).toHaveText(
        "Book the room"
      )
    );
  });

  it("gives its slot attributes, so the line can be described by its chips", () => {
    Scene.scene(
      { update, view },
      Scene.given({ selectedIds: [], isExpanded: false }),
      Scene.expect(Scene.selector("span.slot#notes-slot")).toHaveText("open"),
      Scene.expect(Scene.selector(".row")).toHaveAttr(
        "aria-describedby",
        "notes-slot"
      )
    );
  });
});

describe("Rows cursor", () => {
  const keys = ["notes", "room"];

  const cursorView = (model: Model, h: HtmlBuilder<Message>) =>
    Rows.view(
      {
        label: "Tasks",
        isTreegrid: true,
        rows: Array.map(keys, (key, index) =>
          Rows.rowView(
            {
              key,
              treegrid: { level: 1, position: index + 1, setSize: keys.length },
              body: [key],
              attributes: [
                h.AriaLabel(key),
                h.Tabindex(Array.contains(model.selectedIds, key) ? 0 : -1),
                ...(Array.contains(model.selectedIds, key)
                  ? [h.AriaCurrent("true")]
                  : []),
                h.DataAttribute("key", key),
              ],
            },
            h
          )
        ),
      },
      h
    );

  it("puts the application's cursor on the row's line, a named treegrid row", () => {
    Scene.scene(
      { update, view: cursorView },
      Scene.given({ selectedIds: ["room"], isExpanded: false }),
      Scene.expect(Scene.role("row", { name: "room" })).toHaveClass("row"),
      Scene.expect(Scene.role("row", { name: "room" })).toHaveAttr(
        "aria-current",
        "true"
      ),
      Scene.expect(Scene.role("row", { name: "room" })).toHaveAttr(
        "data-key",
        "room"
      ),
      Scene.expect(Scene.role("row", { name: "notes" })).not.toHaveAttr(
        "aria-current"
      ),
      Scene.expect(Scene.selector("li[aria-current]")).toBeAbsent()
    );
  });
});

const toolsView = (_model: Model, h: HtmlBuilder<Message>) =>
  Rows.view(
    {
      label: "Tasks",
      rows: [
        Rows.rowView(
          {
            key: "notes",
            body: ["notes"],
            actions: [h.button([h.Class("approve")], ["Approve"])],
            tools: [h.button([h.AriaLabel("Edit notes")], ["e"])],
            attributes: [h.Role("group"), h.AriaLabel("notes")],
          },
          h
        ),
        Rows.rowView(
          {
            key: "room",
            body: ["room"],
            tools: [],
            attributes: [h.DataAttribute("key", "room")],
          },
          h
        ),
      ],
    },
    h
  );

describe("Rows tools", () => {
  it("prints the tools in the row's line, and nothing for none", () => {
    Scene.scene(
      { update, view: toolsView },
      Scene.given({ selectedIds: [], isExpanded: false }),
      Scene.expect(Scene.selector("div.row span.tools button")).toHaveAttr(
        "aria-label",
        "Edit notes"
      ),
      Scene.expect(Scene.selector("div.row span.tools .approve")).toBeAbsent(),
      Scene.expect(Scene.selector('[data-key="room"] span.tools')).toBeAbsent()
    );
  });
});

const contextView = (model: Model, h: HtmlBuilder<Message>) =>
  Rows.view(
    {
      label: "Tasks",
      rows: [
        Rows.rowView(
          {
            key: "trip",
            body: ["Plan the trip"],
            isContext: true,
            select: {
              id: "row-trip",
              isChecked: Array.contains(model.selectedIds, "trip"),
              onToggle: (isChecked) =>
                Message.ToggledRow({ id: "trip", isChecked }),
            },
          },
          h
        ),
        Rows.rowView({ key: "tickets", body: ["Book the tickets"] }, h),
      ],
    },
    h
  );

describe("Rows context", () => {
  it("says a context row is one in words, not by its muting alone", () => {
    Scene.scene(
      { update, view: contextView },
      Scene.given({ selectedIds: [], isExpanded: false }),
      Scene.expect(
        Scene.role("checkbox", { name: "Plan the trip (context)" })
      ).toExist(),
      Scene.expect(Scene.selector(".row.context .sr-only")).toHaveText(
        " (context)"
      ),
      Scene.expect(Scene.selector(".row:not(.context) .sr-only")).toBeAbsent()
    );
  });
});

describe("Rows treegrid", () => {
  it("prints a keyboard list as a treegrid of rows and cells", () => {
    const treegrid = (model: Model, h: HtmlBuilder<Message>) =>
      Rows.view(
        {
          label: "Tasks",
          isOutline: true,
          isTreegrid: true,
          rows: [
            Rows.rowView(
              {
                key: "notes",
                treegrid: {
                  level: 1,
                  position: 1,
                  setSize: 2,
                  isExpanded: model.isExpanded,
                },
                glyph: Rows.toggleView(
                  {
                    isExpanded: model.isExpanded,
                    label: "Notes",
                    onToggle: Message.ClickedFold(),
                  },
                  h
                ),
                body: ["Write the notes"],
                slot: ["open"],
                tools: [h.button([], ["rename"])],
                attributes: [h.AriaLabel("Write the notes")],
                nested: model.isExpanded
                  ? [
                      Rows.rowView(
                        {
                          key: "room",
                          treegrid: { level: 2, position: 1, setSize: 1 },
                          select: {
                            id: "row-room",
                            isChecked: Array.contains(
                              model.selectedIds,
                              "room"
                            ),
                            onToggle: (isChecked) =>
                              Message.ToggledRow({ id: "room", isChecked }),
                          },
                          body: ["Book the room"],
                          attributes: [h.AriaLabel("Book the room")],
                        },
                        h
                      ),
                    ]
                  : [],
              },
              h
            ),
            Rows.rowView(
              {
                key: "drafts",
                treegrid: { level: 1, position: 2, setSize: 2 },
                body: ["Archive the drafts"],
                attributes: [h.AriaLabel("Archive the drafts")],
              },
              h
            ),
          ],
        },
        h
      );

    Scene.scene(
      { update, view: treegrid },
      Scene.given<Model>({ selectedIds: [], isExpanded: true }),
      Scene.expect(Scene.role("treegrid", { name: "Tasks" })).toHaveClass(
        "rows"
      ),
      Scene.expect(Scene.role("row", { name: "Write the notes" })).toHaveAttr(
        "aria-level",
        "1"
      ),
      Scene.expect(Scene.role("row", { name: "Write the notes" })).toHaveAttr(
        "aria-expanded",
        "true"
      ),
      Scene.expect(Scene.role("row", { name: "Write the notes" })).toHaveAttr(
        "aria-posinset",
        "1"
      ),
      Scene.expect(Scene.role("row", { name: "Write the notes" })).toHaveAttr(
        "aria-setsize",
        "2"
      ),
      Scene.expect(Scene.role("row", { name: "Book the room" })).toHaveAttr(
        "aria-level",
        "2"
      ),
      Scene.expect(
        Scene.role("row", { name: "Archive the drafts" })
      ).not.toHaveAttr("aria-expanded"),
      Scene.expect(Scene.selector('[role="treegrid"] li')).toHaveAttr(
        "role",
        "none"
      ),
      Scene.expect(Scene.selector('[role="treegrid"] ul')).toHaveAttr(
        "role",
        "none"
      ),
      Scene.expect(
        Scene.selector('[aria-label="Write the notes"] .cell')
      ).toHaveAttr("role", "gridcell"),
      Scene.expect(
        Scene.selector('[aria-label="Write the notes"] .grow')
      ).toHaveAttr("role", "gridcell"),
      Scene.expect(
        Scene.selector('[aria-label="Write the notes"] .slot')
      ).toHaveAttr("role", "gridcell"),
      Scene.expect(
        Scene.selector('[aria-label="Write the notes"] .tools')
      ).toHaveAttr("role", "gridcell"),
      Scene.expect(
        Scene.selector('[aria-label="Book the room"] .row-check')
      ).toHaveAttr("role", "gridcell"),
      Scene.expect(
        Scene.selector('[aria-label="Book the room"] .grow-cell')
      ).toHaveAttr("role", "gridcell"),
      Scene.click(Scene.role("checkbox", { name: "Book the room" })),
      Scene.expect(
        Scene.role("checkbox", { name: "Book the room" })
      ).toHaveAttr("aria-checked", "true"),
      Scene.click(Scene.role("button", { name: "Rows under Notes" })),
      Scene.expect(Scene.role("row", { name: "Write the notes" })).toHaveAttr(
        "aria-expanded",
        "false"
      )
    );
  });

  it("leaves a list that is not a treegrid a plain list", () => {
    Scene.scene(
      { update, view },
      Scene.given<Model>({ selectedIds: [], isExpanded: true }),
      Scene.expect(Scene.role("list", { name: "Tasks" })).toHaveClass("rows"),
      Scene.expect(Scene.selector(".row")).not.toHaveAttr("role"),
      Scene.expect(Scene.selector(".row .grow")).not.toHaveAttr("role")
    );
  });
});

const linkedView = (_model: Model, h: HtmlBuilder<Message>) =>
  Rows.view(
    {
      label: "Linked tasks",
      rows: [
        Rows.rowView(
          {
            key: "brief",
            glyph: Chip.dotView({ label: "In progress", tone: "Go" }, h),
            body: [
              h.a(
                [h.Href("/tasks/brief"), h.AriaCurrent("page")],
                ["Write the brief"]
              ),
            ],
            actions: [
              h.button(
                [h.OnClick(Message.ClickedOpen({ id: "brief" }))],
                ["Task menu"]
              ),
            ],
            isLink: true,
          },
          h
        ),
        Rows.rowView({ key: "plain", body: ["Read the brief"] }, h),
        Rows.rowView(
          {
            key: "grid",
            body: [h.a([h.Href("/tasks/grid")], ["File the brief"])],
            isLink: true,
            treegrid: { level: 1, position: 3, setSize: 3 },
          },
          h
        ),
      ],
    },
    h
  );

describe("A row whose box is its link's target", () => {
  it("marks the row linked and leaves the link the one stop, its controls their own", () => {
    Scene.scene(
      { update, view: linkedView },
      Scene.given<Model>({ selectedIds: [], isExpanded: false }),
      Scene.expect(Scene.nth(Scene.all.selector(".row"), 0)).toHaveClass(
        "linked"
      ),
      Scene.expect(Scene.nth(Scene.all.selector(".row"), 1)).not.toHaveClass(
        "linked"
      ),
      Scene.expect(Scene.role("button", { name: "Task menu" })).toExist(),
      Scene.expect(
        Scene.role("row", { name: "File the brief" })
      ).not.toHaveClass("linked"),
      Scene.expect(Scene.role("link", { name: "Write the brief" })).toHaveAttr(
        "href",
        "/tasks/brief"
      ),
      Scene.expect(Scene.selector(".row.linked")).not.toHaveAttr("tabindex"),
      Scene.expect(Scene.role("img", { name: "In progress" })).toHaveAttr(
        "data-tip",
        "In progress"
      ),
      Scene.expect(Scene.selector(".row.linked a button")).toBeAbsent(),
      Scene.expect(Scene.selector(".row.linked .grow a")).toHaveAttr(
        "aria-current",
        "page"
      )
    );
  });
});
