import { Dialog as UiDialog } from "@foldkit/ui";
import { Array, Effect, Equal, Fiber, HashSet, Option, Stream } from "effect";
import { Scene, Story } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { modifyFields } from "foldkit/struct";
import { assert, describe, expect, it } from "vite-plus/test";

import * as Dialog from "../dialog/dialog.ts";
import { htmlElement } from "../dom/html-element.ts";
import * as Focus from "../focus/focus.ts";
import { keydown, readDuringDispatch } from "../test/events.ts";
import { byId, bySelector, renderOnPage } from "../test/fixture.ts";
import { settleUntil } from "../test/settle.ts";
import * as CommandPalette from "./command-palette.ts";
import {
  BindPaletteKeys,
  composingKey,
  earlyKey,
  fieldKey,
  rowPress,
} from "./keys.ts";
import { findChoices, findCommands, matches, pageChoices } from "./match.ts";
import type { Choice, Command, Page } from "./match.ts";
import { Message } from "./message.ts";
import type { ArrowKey, ShownRow } from "./message.ts";

const STATUS: Page = {
  title: "Status",
  current: "todo",
  choices: [
    { id: "inbox", label: "Inbox" },
    { id: "todo", label: "To do" },
    { id: "doing", label: "In progress" },
    { id: "done", label: "Done" },
  ],
};

const STATUS_FROM_DOING: Page = { ...STATUS, start: "doing" };

const PLACES: Page = {
  title: "Move to",
  current: "website",
  choices: [
    { id: "projects", label: "Projects", level: 1 },
    { id: "website", label: "Website", level: 2 },
    { id: "launch", label: "Launch", level: 3 },
    { id: "garden", label: "Garden", level: 2 },
    { id: "someday", label: "Someday", level: 1 },
    { id: "boat", label: "Boat", level: 2 },
  ],
};

const COMMANDS: readonly Command[] = [
  { id: "edit", label: "Edit item", group: "Item", hint: "enter" },
  { id: "status", label: "Change status", group: "Item", page: STATUS },
  {
    id: "archive",
    label: "Archive",
    group: "Item",
    isDisabled: true,
    reason: "Saving…",
  },
  { id: "keys", label: "Keyboard shortcuts", group: "Anywhere", hint: "?" },
  {
    id: "note",
    label: "Renew the certificate",
    group: "Titles",
    isAuthored: true,
    glyph: "pin",
  },
];

const startingOnDoing = Array.map(COMMANDS, (command) =>
  command.id === "status" ? { ...command, page: STATUS_FROM_DOING } : command
);

const shownRow = (rowId: string): ShownRow => ({
  id: rowId,
  isHeld: rowId === "archive" || rowId === "todo",
  hasPage: rowId === "status",
});

const click = (
  rowId: string,
  maybeShownPage: Option.Option<string> = Option.none()
) => Message.ClickedRow({ row: shownRow(rowId), maybeShownPage });

const closed = CommandPalette.init({ id: "palette" });
const opened = CommandPalette.open(closed).model;
const onStatus = CommandPalette.update(opened, click("status")).model;
const ON_COMMANDS = Option.none<string>();

const onStat = CommandPalette.update(
  opened,
  Message.UpdatedQuery({ value: "stat", maybeShownPage: ON_COMMANDS })
).model;

const ON_STATUS = Option.some("status");
const picking = CommandPalette.update(onStatus, click("done", ON_STATUS)).model;

const COMMAND_ROWS = ["edit", "status", "archive", "keys"];
const STATUS_ROWS = ["inbox", "todo", "doing", "done"];

type Shown = Readonly<{
  rowIds?: readonly string[];
  shownCursor?: string;
  maybeShownPage?: Option.Option<string>;
  shownQuery?: string;
  shownShift?: number;
}>;

const shownList = ({
  rowIds = COMMAND_ROWS,
  shownCursor = "edit",
  maybeShownPage = ON_COMMANDS,
  shownQuery = "",
  shownShift = 0,
}: Shown = {}) => ({
  rows: Array.map(rowIds, shownRow),
  maybeShownCursor: Array.findFirst(rowIds, (rowId) => rowId === shownCursor),
  maybeShownPage,
  shownQuery,
  shownShift,
});

const arrow = (key: ArrowKey, shown: Shown = {}) =>
  Message.PressedArrowKey({ key, snapshot: shownList(shown) });

const enter = (shown: Shown = {}) =>
  Message.PressedEnter({ snapshot: shownList(shown) });

const earlyArrow = (key: ArrowKey) => Message.PressedEarlyArrowKey({ key });

const showed = (model: CommandPalette.Model, rowId: string) =>
  Message.CompletedReportPendingKeys({
    renderGeneration: model.renderGeneration,
    maybeRow: Option.some(shownRow(rowId)),
  });

const reportOf = (model: CommandPalette.Model) => ({
  name: CommandPalette.ReportPendingKeys.name,
  args: {
    paletteId: CommandPalette.id(model),
    renderGeneration: model.renderGeneration,
  },
});

const callsOf = (result: ReturnType<typeof CommandPalette.update>) =>
  Array.map(result.commands ?? [], ({ name, args }) => ({ name, args }));

const onStatusPage = {
  rowIds: STATUS_ROWS,
  shownCursor: "todo",
  maybeShownPage: ON_STATUS,
};

const pressAll = (model: CommandPalette.Model, messages: readonly Message[]) =>
  Array.reduce(
    messages,
    model,
    (current, message) => CommandPalette.update(current, message).model
  );

const resolveScroll = Story.Command.resolve(
  CommandPalette.ScrollToCursor,
  Message.CompletedScrollToCursor()
);

const resolveFocus = Story.Command.resolve(
  Focus.Focus,
  Message.CompletedFocus()
);

const resolveClose = Story.Command.resolve(
  UiDialog.CloseDialog,
  UiDialog.Message.CompletedCloseDialog()
);

const resolveStaleReport = Story.Command.resolve(
  CommandPalette.ReportPendingKeys,
  Message.CompletedReportPendingKeys({
    renderGeneration: -1,
    maybeRow: Option.none(),
  })
);

const pressDown = Story.steps(Story.message(arrow("ArrowDown")), resolveScroll);

const pressStaleDown = Story.steps(pressDown, resolveStaleReport);

const pressEarlyDown = Story.steps(
  Story.message(earlyArrow("ArrowDown")),
  resolveScroll,
  resolveStaleReport
);

const ids = (rows: readonly Choice[]) => Array.map(rows, ({ id }) => id);

describe("CommandPalette finding", () => {
  it("lists the commands by group, holding authored titles back until a query", () => {
    expect(ids(findCommands(COMMANDS, ""))).toStrictEqual([
      "edit",
      "status",
      "archive",
      "keys",
    ]);
  });

  it("finds by letters in order, titles after commands", () => {
    expect(ids(findCommands(COMMANDS, "rnw"))).toStrictEqual(["note"]);
    expect(ids(findCommands(COMMANDS, "e"))).toStrictEqual([
      "edit",
      "status",
      "archive",
      "keys",
      "note",
    ]);
    expect(matches("  KEYB ", "Keyboard shortcuts")).toBe(true);
    expect(matches("zz", "Keyboard shortcuts")).toBe(false);
  });

  it("finds in a page's choices by its query", () => {
    expect(ids(findChoices(STATUS, "do"))).toStrictEqual(["todo", "done"]);
    expect(ids(findChoices(STATUS, " "))).toHaveLength(4);
  });

  it("shows a found choice with the choices it sits under in a page's tree, in the page's order", () => {
    expect(ids(pageChoices(PLACES, "lau").rows)).toStrictEqual([
      "projects",
      "website",
      "launch",
    ]);
    expect(ids(pageChoices(PLACES, "lau").found)).toStrictEqual(["launch"]);
    expect(ids(pageChoices(PLACES, "o").rows)).toStrictEqual([
      "projects",
      "someday",
      "boat",
    ]);
    expect(ids(pageChoices(PLACES, "gar").rows)).toStrictEqual([
      "projects",
      "garden",
    ]);
    expect(ids(pageChoices(PLACES, "").rows)).toStrictEqual(
      ids(PLACES.choices)
    );
    expect(ids(pageChoices(PLACES, " ").found)).toStrictEqual(
      ids(PLACES.choices)
    );
    expect(HashSet.size(pageChoices(PLACES, "").contextIds)).toBe(0);
    expect(ids(pageChoices(STATUS, "do").rows)).toStrictEqual(
      ids(findChoices(STATUS, "do"))
    );
  });
});

describe("CommandPalette update", () => {
  it("opens fresh on the commands, focus in the field", () => {
    const stale = modifyFields(closed, {
      query: () => "old words",
      maybeCursor: () => Option.some("keys"),
    });

    const palette = CommandPalette.open(stale);

    expect(CommandPalette.isOpen(palette.model)).toBe(true);
    expect(CommandPalette.query(palette.model)).toBe("");
    expect(palette.model.maybeCursor).toStrictEqual(Option.none());
    expect(palette.commands?.map(({ name }) => name)).toStrictEqual([
      UiDialog.ShowDialog.name,
    ]);
  });

  it("selects a command, closing first, without reporting Closed", () => {
    Story.story(
      CommandPalette.update,
      Story.given(opened),
      Story.message(click("edit")),
      Story.expectOutMessage(
        CommandPalette.OutMessage.SelectedCommand({ id: "edit" })
      ),
      Story.model((model) => {
        expect(CommandPalette.isOpen(model)).toBe(false);
      }),
      Story.Command.resolve(
        UiDialog.CloseDialog,
        UiDialog.Message.CompletedCloseDialog()
      )
    );
  });

  it("opens a page, and Back restores the commands' query and cursor", () => {
    Story.story(
      CommandPalette.update,
      Story.given(opened),
      Story.message(
        Message.UpdatedQuery({ value: "stat", maybeShownPage: ON_COMMANDS })
      ),
      resolveScroll,
      Story.message(
        arrow("ArrowDown", {
          rowIds: ["status"],
          shownCursor: "status",
          shownQuery: "stat",
        })
      ),
      resolveScroll,
      Story.message(click("status")),
      resolveFocus,
      resolveScroll,
      Story.model((model) => {
        expect(CommandPalette.query(model)).toBe("");
        expect(CommandPalette.maybePageId(model)).toStrictEqual(ON_STATUS);
      }),
      Story.message(
        Message.UpdatedQuery({ value: "do", maybeShownPage: ON_STATUS })
      ),
      resolveScroll,
      Story.message(Message.ClickedBack()),
      resolveFocus,
      resolveScroll,
      Story.model((model) => {
        expect(model.maybePage).toStrictEqual(Option.none());
        expect(CommandPalette.query(model)).toBe("stat");
        expect(model.maybeCursor).toStrictEqual(Option.some("status"));
      })
    );
  });

  it("moves a page's cursor and leaves the commands' where it was", () => {
    Story.story(
      CommandPalette.update,
      Story.given(onStatus),
      Story.message(arrow("ArrowDown", onStatusPage)),
      resolveScroll,
      Story.model((model) => {
        expect(
          Option.flatMap(model.maybePage, (page) => page.maybeCursor)
        ).toStrictEqual(Option.some("doing"));
        expect(model.maybeCursor).toStrictEqual(Option.none());
      })
    );
  });

  it("goes back on Backspace in an empty field only from a page", () => {
    Story.story(
      CommandPalette.update,
      Story.given(onStatus),
      Story.message(Message.PressedBackspace({ maybeShownPage: ON_STATUS })),
      resolveFocus,
      resolveScroll,
      Story.model((model) => {
        expect(model.maybePage).toStrictEqual(Option.none());
      })
    );
    Story.story(
      CommandPalette.update,
      Story.given(opened),
      Story.message(Message.PressedBackspace({ maybeShownPage: ON_COMMANDS })),
      Story.Command.expectNone(),
      Story.model((model) => {
        expect(model).toStrictEqual(opened);
      })
    );
  });

  it("follows the view when a page's command leaves while it is open", () => {
    Story.story(
      CommandPalette.update,
      Story.given(picking),
      Story.message(
        Message.UpdatedQuery({ value: "ke", maybeShownPage: ON_COMMANDS })
      ),
      resolveScroll,
      Story.model((model) => {
        expect(CommandPalette.maybePageId(model)).toStrictEqual(Option.none());
        expect(CommandPalette.isPicking(model)).toBe(false);
        expect(CommandPalette.query(model)).toBe("ke");
      }),
      Story.message(
        arrow("ArrowDown", {
          rowIds: ["keys"],
          shownCursor: "keys",
          shownQuery: "ke",
        })
      ),
      resolveScroll,
      Story.model((model) => {
        expect(model.maybeCursor).toStrictEqual(Option.some("keys"));
        expect(CommandPalette.pickSucceeded(model, "done").model).toStrictEqual(
          model
        );
      })
    );
  });

  it("selects the command clicked on the commands the view shows, past a page whose command left", () => {
    Story.story(
      CommandPalette.update,
      Story.given(picking),
      Story.message(click("edit")),
      Story.expectOutMessage(
        CommandPalette.OutMessage.SelectedCommand({ id: "edit" })
      ),
      Story.Command.resolve(
        UiDialog.CloseDialog,
        UiDialog.Message.CompletedCloseDialog()
      )
    );
  });

  it("drops a page the view no longer shows as it takes an arrow's row", () => {
    Story.story(
      CommandPalette.update,
      Story.given(onStatus),
      pressDown,
      Story.model((model) => {
        expect(CommandPalette.maybePageId(model)).toStrictEqual(Option.none());
        expect(model.maybeCursor).toStrictEqual(Option.some("status"));
      })
    );
  });

  it("holds the page while a pick is out: no moving, typing, picking, Enter, Back or Backspace", () => {
    Story.story(
      CommandPalette.update,
      Story.given(onStatus),
      Story.message(click("done", ON_STATUS)),
      Story.expectOutMessage(
        CommandPalette.OutMessage.SelectedChoice({
          commandId: "status",
          choiceId: "done",
        })
      ),
      Story.message(arrow("ArrowUp", onStatusPage)),
      Story.message(
        Message.UpdatedQuery({ value: "x", maybeShownPage: ON_STATUS })
      ),
      Story.message(enter(onStatusPage)),
      Story.message(click("inbox", ON_STATUS)),
      Story.expectNoOutMessage(),
      Story.Command.expectNone(),
      Story.message(Message.ClickedBack()),
      Story.message(Message.PressedBackspace({ maybeShownPage: ON_STATUS })),
      Story.model((model) => {
        expect(CommandPalette.isPicking(model)).toBe(true);
        expect(CommandPalette.maybePageId(model)).toStrictEqual(ON_STATUS);
        expect(CommandPalette.query(model)).toBe("");
        expect(
          Option.flatMap(model.maybePage, (page) => page.maybeCursor)
        ).toStrictEqual(Option.some("done"));
      })
    );
  });

  it("closes when the pick lands, and stays on the choice when it is refused", () => {
    const landed = CommandPalette.pickSucceeded(picking, "done");
    const refused = CommandPalette.pickFailed(picking, "done");

    expect(CommandPalette.isOpen(landed.model)).toBe(false);
    expect(CommandPalette.isPicking(refused.model)).toBe(false);
    expect(
      Option.map(refused.model.maybePage, (page) => page.maybeCursor)
    ).toStrictEqual(Option.some(Option.some("done")));
  });

  it("reports Closed on Escape, even mid-pick, and ignores the pick's late answer", () => {
    Story.story(
      CommandPalette.update,
      Story.given(picking),
      Story.message(
        Message.GotDialogMessage({
          message: Dialog.Message.GotDialogMessage({
            message: UiDialog.Message.RequestedClose(),
          }),
        })
      ),
      Story.expectOutMessage(CommandPalette.OutMessage.Closed()),
      Story.Command.resolve(
        UiDialog.CloseDialog,
        UiDialog.Message.CompletedCloseDialog()
      ),
      Story.model((model) => {
        const reopened = CommandPalette.open(model).model;
        expect(
          CommandPalette.pickSucceeded(reopened, "done").model
        ).toStrictEqual(reopened);
      })
    );
  });

  it("steps each arrow one row from where the last left it, stopping at the ends", () => {
    Story.story(
      CommandPalette.update,
      Story.given(opened),
      pressDown,
      pressDown,
      Story.model((model) => {
        expect(model.maybeCursor).toStrictEqual(Option.some("archive"));
      }),
      ...Array.replicate(pressDown, 5),
      Story.model((model) => {
        expect(model.maybeCursor).toStrictEqual(Option.some("keys"));
      }),
      Story.message(arrow("ArrowUp")),
      resolveScroll,
      Story.model((model) => {
        expect(model.maybeCursor).toStrictEqual(Option.some("archive"));
      })
    );
    Story.story(
      CommandPalette.update,
      Story.given(opened),
      Story.message(arrow("ArrowUp")),
      Story.Command.expectExact(CommandPalette.ScrollToCursor),
      resolveScroll,
      Story.model((model) => {
        expect(model.maybeCursor).toStrictEqual(Option.some("edit"));
      })
    );
  });

  it("steps from the row the render showed once the cursor's own row is not listed", () => {
    const onArchive = modifyFields(opened, {
      maybeCursor: () => Option.some("archive"),
    });

    const withoutArchive = {
      rowIds: ["edit", "status", "keys"],
      shownCursor: "edit",
    };

    Story.story(
      CommandPalette.update,
      Story.given(onArchive),
      Story.message(arrow("ArrowDown", withoutArchive)),
      resolveScroll,
      Story.model((model) => {
        expect(model.maybeCursor).toStrictEqual(Option.some("status"));
      })
    );
    Story.story(
      CommandPalette.update,
      Story.given(opened),
      Story.message(arrow("ArrowDown", { rowIds: [] })),
      Story.Command.expectNone(),
      Story.model((model) => {
        expect(model).toStrictEqual(opened);
      })
    );
  });

  it("runs the cursor's row on Enter as a click on it does, and nothing on a held row", () => {
    Story.story(
      CommandPalette.update,
      Story.given(opened),
      Story.message(enter()),
      Story.expectOutMessage(
        CommandPalette.OutMessage.SelectedCommand({ id: "edit" })
      ),
      Story.model((model) => {
        expect(CommandPalette.isOpen(model)).toBe(false);
      }),
      resolveClose
    );
    Story.story(
      CommandPalette.update,
      Story.given(opened),
      pressDown,
      Story.message(enter({ shownCursor: "status" })),
      resolveFocus,
      resolveScroll,
      Story.model((model) => {
        expect(CommandPalette.maybePageId(model)).toStrictEqual(ON_STATUS);
      }),
      Story.message(arrow("ArrowDown", onStatusPage)),
      resolveScroll,
      Story.message(enter({ ...onStatusPage, shownCursor: "doing" })),
      Story.expectOutMessage(
        CommandPalette.OutMessage.SelectedChoice({
          commandId: "status",
          choiceId: "doing",
        })
      )
    );
    Story.story(
      CommandPalette.update,
      Story.given(opened),
      pressDown,
      pressDown,
      Story.message(enter()),
      Story.Command.expectNone(),
      Story.expectNoOutMessage(),
      Story.model((model) => {
        expect(model.maybeCursor).toStrictEqual(Option.some("archive"));
      })
    );
    Story.story(
      CommandPalette.update,
      Story.given(onStatus),
      Story.message(enter(onStatusPage)),
      Story.Command.expectNone(),
      Story.expectNoOutMessage()
    );
    Story.story(
      CommandPalette.update,
      Story.given(opened),
      Story.message(enter({ rowIds: [] })),
      Story.Command.expectNone(),
      Story.model((model) => {
        expect(model).toStrictEqual(opened);
      })
    );
  });

  it("opens straight on a page", () => {
    const atStatus = CommandPalette.openAt(closed, { commandId: "status" });

    expect(atStatus.model.maybePage).toStrictEqual(
      Option.some({
        commandId: "status",
        query: "",
        maybeCursor: Option.none(),
      })
    );
    expect(CommandPalette.maybePageId(atStatus.model)).toStrictEqual(ON_STATUS);
  });
});

describe("CommandPalette waiting arrows", () => {
  const withoutEdit = COMMANDS.filter((command) => command.id !== "edit");
  const withoutStatus = COMMANDS.filter((command) => command.id !== "status");

  it("refuses a report from a render before the query changed, even once the query is back", () => {
    const firstPending = CommandPalette.update(
      opened,
      earlyArrow("ArrowDown")
    ).model;

    const pendingAgain = pressAll(firstPending, [
      Message.UpdatedQuery({ value: "k", maybeShownPage: ON_COMMANDS }),
      Message.UpdatedQuery({ value: "", maybeShownPage: ON_COMMANDS }),
      earlyArrow("ArrowDown"),
    ]);

    expect(
      CommandPalette.update(pendingAgain, showed(firstPending, "status")).model
    ).toStrictEqual(pendingAgain);

    const settled = CommandPalette.update(
      pendingAgain,
      showed(pendingAgain, "status")
    ).model;

    expect(settled.maybeCursor).toStrictEqual(Option.some("status"));
    expect(settled.cursorShift).toBe(0);
  });

  it("counts the arrows pressed before the view caught up, as it opens", () => {
    Story.story(
      CommandPalette.update,
      Story.given(opened),
      Story.message(earlyArrow("ArrowDown")),
      Story.Command.expectExact(
        CommandPalette.ScrollToCursor({ paletteId: "palette" }),
        CommandPalette.ReportPendingKeys({
          paletteId: "palette",
          renderGeneration: CommandPalette.update(
            opened,
            earlyArrow("ArrowDown")
          ).model.renderGeneration,
        })
      ),
      resolveScroll,
      resolveStaleReport
    );
    Story.story(
      CommandPalette.update,
      Story.given(CommandPalette.open(closed).model),
      pressEarlyDown,
      pressEarlyDown,
      Story.model((model) => {
        expect(model.cursorShift).toBe(2);
        expect(CommandPalette.maybeCursorId(model, COMMANDS)).toStrictEqual(
          Option.some("archive")
        );
      }),
      ...Array.replicate(pressEarlyDown, 5),
      Story.model((model) => {
        expect(CommandPalette.maybeCursorId(model, COMMANDS)).toStrictEqual(
          Option.some("keys")
        );
      })
    );
    Story.story(
      CommandPalette.update,
      Story.given(CommandPalette.openAt(closed, { commandId: "status" }).model),
      pressEarlyDown,
      Story.model((model) => {
        expect(CommandPalette.maybeCursorId(model, COMMANDS)).toStrictEqual(
          Option.some("doing")
        );
      })
    );
    Story.story(
      CommandPalette.update,
      Story.given(picking),
      Story.message(earlyArrow("ArrowDown")),
      Story.Command.expectNone(),
      Story.model((model) => {
        expect(model).toStrictEqual(picking);
      })
    );
  });

  it("makes the row the next render shows the cursor, so it holds as the list changes", () => {
    const pressed = pressAll(opened, [
      earlyArrow("ArrowDown"),
      earlyArrow("ArrowDown"),
    ]);

    Story.story(
      CommandPalette.update,
      Story.given(pressed),
      Story.message(showed(pressed, "archive")),
      Story.Command.expectExact(CommandPalette.ScrollToCursor),
      resolveScroll,
      Story.model((model) => {
        expect(model.maybeCursor).toStrictEqual(Option.some("archive"));
        expect(model.cursorShift).toBe(0);
        expect(CommandPalette.maybeCursorId(model, withoutEdit)).toStrictEqual(
          Option.some("archive")
        );
      })
    );
    Story.story(
      CommandPalette.update,
      Story.given(pressed),
      Story.message(showed(opened, "keys")),
      Story.model((model) => {
        expect(model).toStrictEqual(pressed);
      })
    );
  });

  it("drops arrows waiting on a row that left the list, rather than count from another", () => {
    Story.story(
      CommandPalette.update,
      Story.given(opened),
      pressDown,
      pressEarlyDown,
      Story.model((model) => {
        expect(CommandPalette.maybeCursorId(model, COMMANDS)).toStrictEqual(
          Option.some("archive")
        );
        expect(
          CommandPalette.maybeCursorId(model, withoutStatus)
        ).toStrictEqual(Option.some("edit"));
      })
    );
  });

  it("steps from the new query's rows when the arrows follow the typing at once", () => {
    const typeThenPressTwice = Story.steps(
      Story.given(opened),
      Story.message(
        Message.UpdatedQuery({ value: "e", maybeShownPage: ON_COMMANDS })
      ),
      resolveScroll,
      pressStaleDown,
      pressStaleDown
    );

    const nextRender = {
      rowIds: ["edit", "status", "archive", "keys", "note"],
      shownCursor: "archive",
      shownQuery: "e",
      shownShift: 2,
    };

    Story.story(
      CommandPalette.update,
      typeThenPressTwice,
      Story.model((model) => {
        expect(model.maybeCursor).toStrictEqual(Option.none());
        expect(CommandPalette.maybeCursorId(model, COMMANDS)).toStrictEqual(
          Option.some("archive")
        );
      }),
      Story.message(arrow("ArrowDown", nextRender)),
      resolveScroll,
      Story.model((model) => {
        expect(model.maybeCursor).toStrictEqual(Option.some("keys"));
        expect(model.cursorShift).toBe(0);
      })
    );
    Story.story(
      CommandPalette.update,
      typeThenPressTwice,
      Story.message(arrow("ArrowDown", { ...nextRender, shownShift: 1 })),
      resolveScroll,
      resolveStaleReport,
      Story.model((model) => {
        expect(model.cursorShift).toBe(3);
      })
    );
  });

  it("holds an Enter pressed before the view caught up for the row the next render settles on", () => {
    const afterK = pressAll(opened, [
      Message.UpdatedQuery({ value: "k", maybeShownPage: ON_COMMANDS }),
    ]);

    const pended = CommandPalette.update(afterK, enter());
    const typed = pended.model;
    const settled = CommandPalette.update(typed, showed(typed, "keys"));

    const early = pressAll(opened, [
      earlyArrow("ArrowDown"),
      Message.PressedEarlyEnter(),
    ]);

    const earlySettled = CommandPalette.update(early, showed(early, "status"));

    const settledOnNothing = CommandPalette.update(
      typed,
      Message.CompletedReportPendingKeys({
        renderGeneration: typed.renderGeneration,
        maybeRow: Option.none(),
      })
    );

    expect(typed.isEnterPending).toBe(true);
    expect(callsOf(pended)).toStrictEqual([reportOf(typed)]);
    expect(settled.model.isEnterPending).toBe(false);
    expect(settled.model.maybeCursor).toStrictEqual(Option.some("keys"));
    expect(CommandPalette.isOpen(settled.model)).toBe(false);
    expect(settled.outMessage).toStrictEqual(
      CommandPalette.OutMessage.SelectedCommand({ id: "keys" })
    );
    expect(settled.commands?.map(({ name }) => name)).toStrictEqual([
      CommandPalette.ScrollToCursor.name,
      UiDialog.CloseDialog.name,
    ]);
    expect(CommandPalette.maybePageId(earlySettled.model)).toStrictEqual(
      ON_STATUS
    );
    expect(earlySettled.commands?.map(({ name }) => name)).toContain(
      Focus.Focus.name
    );
    expect(settledOnNothing.model.isEnterPending).toBe(false);
    expect(settledOnNothing.commands).toBeUndefined();
  });

  it("asks the next render again for a waiting Enter once an arrow spends the waiting arrows", () => {
    const early = pressAll(opened, [
      earlyArrow("ArrowDown"),
      Message.PressedEarlyEnter(),
    ]);

    const stepped = CommandPalette.update(
      early,
      arrow("ArrowDown", { shownCursor: "status", shownShift: 1 })
    );

    const settled = CommandPalette.update(
      stepped.model,
      showed(stepped.model, "archive")
    );

    expect(stepped.model.maybeCursor).toStrictEqual(Option.some("archive"));
    expect(stepped.model.isEnterPending).toBe(true);
    expect(callsOf(stepped)).toContainEqual(reportOf(stepped.model));
    expect(
      CommandPalette.update(stepped.model, showed(early, "status")).model
    ).toStrictEqual(stepped.model);
    expect(settled.model.isEnterPending).toBe(false);
    expect(settled.outMessage).toBeUndefined();
    expect(CommandPalette.isOpen(settled.model)).toBe(true);
  });

  it("drops a waiting Enter when the reader types after it, so it never runs a later row", () => {
    const waiting = pressAll(opened, [
      Message.UpdatedQuery({ value: "zz", maybeShownPage: ON_COMMANDS }),
      enter(),
    ]);

    const typedAfter = CommandPalette.update(
      waiting,
      Message.UpdatedQuery({ value: "k", maybeShownPage: ON_COMMANDS })
    ).model;

    expect(waiting.isEnterPending).toBe(true);
    expect(typedAfter.isEnterPending).toBe(false);
    expect(
      CommandPalette.update(typedAfter, showed(waiting, "keys")).model
    ).toStrictEqual(typedAfter);
  });

  it("starts the next query, and a page opened or left, with nothing waiting", () => {
    Story.story(
      CommandPalette.update,
      Story.given(opened),
      pressEarlyDown,
      Story.message(
        Message.UpdatedQuery({ value: "k", maybeShownPage: ON_COMMANDS })
      ),
      resolveScroll,
      Story.model((model) => {
        expect(model.cursorShift).toBe(0);
      })
    );
    Story.story(
      CommandPalette.update,
      Story.given(opened),
      pressEarlyDown,
      Story.message(click("status")),
      resolveFocus,
      resolveScroll,
      Story.model((model) => {
        expect(model.cursorShift).toBe(0);
      }),
      pressEarlyDown,
      Story.message(Message.PressedEarlyEnter()),
      resolveStaleReport,
      Story.model((model) => {
        expect(model.cursorShift).toBe(1);
        expect(model.isEnterPending).toBe(true);
      }),
      Story.message(Message.ClickedBack()),
      resolveFocus,
      resolveScroll,
      Story.model((model) => {
        expect(model.maybePage).toStrictEqual(Option.none());
        expect(model.cursorShift).toBe(0);
        expect(model.isEnterPending).toBe(false);
      })
    );
  });
});

describe("CommandPalette accessors", () => {
  const onArchive = modifyFields(opened, {
    maybeCursor: () => Option.some("archive"),
  });

  const withoutArchive = COMMANDS.filter((command) => command.id !== "archive");

  it("reads the cursor's row as shown, falling back once its row leaves", () => {
    expect(CommandPalette.maybeCursorId(opened, COMMANDS)).toStrictEqual(
      Option.some("edit")
    );
    expect(CommandPalette.maybeCursorId(onArchive, COMMANDS)).toStrictEqual(
      Option.some("archive")
    );
    expect(
      CommandPalette.maybeCursorId(onArchive, withoutArchive)
    ).toStrictEqual(Option.some("edit"));
    expect(CommandPalette.maybeCursorId(onStatus, COMMANDS)).toStrictEqual(
      Option.some("todo")
    );
    expect(CommandPalette.maybeCursorId(opened, [])).toStrictEqual(
      Option.none()
    );
  });

  it("starts a page's cursor on its start, else its current, until the reader moves it", () => {
    Story.story(
      CommandPalette.update,
      Story.given(onStatus),
      Story.model((model) => {
        expect(
          CommandPalette.maybeCursorId(model, startingOnDoing)
        ).toStrictEqual(Option.some("doing"));
      }),
      Story.message(
        Message.UpdatedQuery({ value: "do", maybeShownPage: ON_STATUS })
      ),
      resolveScroll,
      Story.model((model) => {
        expect(
          CommandPalette.maybeCursorId(model, startingOnDoing)
        ).toStrictEqual(Option.some("todo"));
      })
    );
    Story.story(
      CommandPalette.update,
      Story.given(onStatus),
      Story.message(arrow("ArrowUp", onStatusPage)),
      resolveScroll,
      Story.model((model) => {
        expect(
          CommandPalette.maybeCursorId(model, startingOnDoing)
        ).toStrictEqual(Option.some("inbox"));
      })
    );
  });

  it("starts a tree page's cursor on the first choice its query finds, not one it sits under", () => {
    const placeCommands: readonly Command[] = [
      { id: "move", label: "Move to", group: "Item", page: PLACES },
    ];

    const onPlaces = CommandPalette.openAt(closed, { commandId: "move" }).model;

    const typed = (value: string) =>
      CommandPalette.update(
        onPlaces,
        Message.UpdatedQuery({ value, maybeShownPage: Option.some("move") })
      ).model;

    expect(CommandPalette.maybeCursorId(onPlaces, placeCommands)).toStrictEqual(
      Option.some("website")
    );
    expect(
      CommandPalette.maybeCursorId(typed("lau"), placeCommands)
    ).toStrictEqual(Option.some("launch"));
    expect(
      CommandPalette.maybeCursorId(typed("boa"), placeCommands)
    ).toStrictEqual(Option.some("boat"));

    const startingOnProjects: readonly Command[] = [
      {
        id: "move",
        label: "Move to",
        group: "Item",
        page: { ...PLACES, start: "projects" },
      },
    ];

    expect(
      CommandPalette.maybeCursorId(typed("lau"), startingOnProjects)
    ).toStrictEqual(Option.some("launch"));
  });

  it("reads the open page, its words and whether a pick is out", () => {
    Story.story(
      CommandPalette.update,
      Story.given(onStatus),
      Story.message(
        Message.UpdatedQuery({ value: "do", maybeShownPage: ON_STATUS })
      ),
      resolveScroll,
      Story.model((model) => {
        expect(CommandPalette.maybePageId(model)).toStrictEqual(ON_STATUS);
        expect(CommandPalette.query(model)).toBe("do");
      })
    );
    expect(CommandPalette.maybePageId(opened)).toStrictEqual(ON_COMMANDS);
    expect(CommandPalette.query(onStat)).toBe("stat");
    expect(CommandPalette.isPicking(onStatus)).toBe(false);
    expect(CommandPalette.isPicking(picking)).toBe(true);
  });
});

const render = async (
  model: CommandPalette.Model,
  commands: readonly Command[] = COMMANDS
): Promise<HTMLElement> => {
  await renderOnPage(model, (current, h: HtmlBuilder<Message>) =>
    CommandPalette.view(current, { commands }, h)
  );

  return bySelector(".card.palette");
};

const fieldOf = (card: Element): HTMLInputElement => {
  const input = card.querySelector('[role="combobox"]');
  assert(
    input instanceof HTMLInputElement,
    "The rendered palette has no field."
  );

  return input;
};

const cursorRowOf = async (
  model: CommandPalette.Model,
  commands: readonly Command[] = COMMANDS
): Promise<Option.Option<string>> => {
  const card = await render(model, commands);

  return Option.flatMapNullishOr(
    htmlElement('[aria-selected="true"]', card),
    (row) => row.dataset["value"]
  );
};

const report = async (model: CommandPalette.Model, paletteId = "palette") =>
  await Effect.runPromise(
    CommandPalette.ReportPendingKeys({
      paletteId,
      renderGeneration: model.renderGeneration,
    }).effect
  );

describe("CommandPalette cursor", () => {
  const onArchive = modifyFields(opened, {
    maybeCursor: () => Option.some("archive"),
  });

  it("scrolls the cursor's row of the palette it is given into view", async () => {
    const card = await render(opened);
    const scrolled: string[] = [];

    for (const option of card.querySelectorAll<HTMLElement>(
      '[role="option"]'
    )) {
      option.scrollIntoView = () => {
        scrolled.push(option.dataset["value"] ?? "");
      };
    }

    await Effect.runPromise(
      CommandPalette.ScrollToCursor({ paletteId: "palette" }).effect
    );
    await Effect.runPromise(
      CommandPalette.ScrollToCursor({ paletteId: "elsewhere" }).effect
    );

    expect(scrolled).toStrictEqual(["edit"]);
  });

  it("shows on the row it was moved to, else the page's start, else its current, else the first row", async () => {
    await expect(cursorRowOf(opened)).resolves.toStrictEqual(
      Option.some("edit")
    );
    await expect(cursorRowOf(onArchive)).resolves.toStrictEqual(
      Option.some("archive")
    );
    await expect(cursorRowOf(onStatus, startingOnDoing)).resolves.toStrictEqual(
      Option.some("doing")
    );
    await expect(cursorRowOf(onStatus)).resolves.toStrictEqual(
      Option.some("todo")
    );
    await expect(cursorRowOf(opened, [])).resolves.toStrictEqual(Option.none());
  });

  it("applies the waiting arrows, and reports the row and the page the render shows", async () => {
    const pressed = pressAll(opened, [
      earlyArrow("ArrowDown"),
      earlyArrow("ArrowDown"),
    ]);

    const card = await render(pressed);
    const onCommands = await report(pressed);
    const pressedOnce = pressAll(opened, [earlyArrow("ArrowDown")]);
    await render(pressedOnce);
    const onStatusCommand = await report(pressedOnce);
    await render(onStatus);
    const onPage = await report(onStatus);
    const elsewhere = await report(onStatus, "elsewhere");

    expect(bySelector('[aria-selected="true"]', card).dataset["value"]).toBe(
      "archive"
    );
    expect(onCommands).toStrictEqual(showed(pressed, "archive"));
    expect(onStatusCommand).toStrictEqual(showed(pressedOnce, "status"));
    expect(onPage).toStrictEqual(showed(onStatus, "todo"));
    expect(elsewhere).toStrictEqual(
      Message.CompletedReportPendingKeys({
        renderGeneration: onStatus.renderGeneration,
        maybeRow: Option.none(),
      })
    );
  });

  it("holds to its row while the list changes, and falls back once its row leaves", async () => {
    const withoutEdit = COMMANDS.filter((command) => command.id !== "edit");

    const withoutArchive = COMMANDS.filter(
      (command) => command.id !== "archive"
    );

    await expect(cursorRowOf(onArchive, withoutEdit)).resolves.toStrictEqual(
      Option.some("archive")
    );
    await expect(cursorRowOf(onArchive, withoutArchive)).resolves.toStrictEqual(
      Option.some("edit")
    );
  });
});

const fieldKeyOf =
  (card: Element) =>
  (
    field: Element,
    key: string,
    init: KeyboardEventInit = {},
    isHandled = false
  ) =>
    readDuringDispatch(
      field,
      keydown(key, init),
      (event) => fieldKey(card, event),
      {
        listenOn: card,
        isHandled,
      }
    );

const guard = (event: KeyboardEvent): void => {
  composingKey(event);
};

describe("CommandPalette keys", () => {
  it("takes Backspace in an empty field with the page it was on, and no other key", async () => {
    const card = await render(onStatus);
    const pressField = fieldKeyOf(card);
    const field = fieldOf(card);

    expect(pressField(field, "Backspace")).toStrictEqual(
      Option.some(Message.PressedBackspace({ maybeShownPage: ON_STATUS }))
    );
    expect(pressField(field, "Enter")).toStrictEqual(Option.none());
    expect(pressField(field, "ArrowDown")).toStrictEqual(Option.none());
    expect(pressField(field, "Home")).toStrictEqual(Option.none());
  });

  it("leaves Backspace alone on the commands and in a field with words", async () => {
    const commandsCard = await render(opened);

    const onCommands = fieldKeyOf(commandsCard)(
      fieldOf(commandsCard),
      "Backspace"
    );

    const pageCard = await render(onStatus);
    const pageField = fieldOf(pageCard);
    pageField.value = "st";

    expect(onCommands).toStrictEqual(Option.none());
    expect(fieldKeyOf(pageCard)(pageField, "Backspace")).toStrictEqual(
      Option.none()
    );
  });

  it("leaves a composing, modified, handled or outside Backspace", async () => {
    const card = await render(onStatus);
    const pressField = fieldKeyOf(card);
    const field = fieldOf(card);
    const row = card.querySelector('[data-value="doing"]');

    if (row === null) {
      throw new Error("The rendered palette has no doing row.");
    }

    expect(pressField(field, "Backspace", { isComposing: true })).toStrictEqual(
      Option.none()
    );
    expect(pressField(field, "Backspace", { metaKey: true })).toStrictEqual(
      Option.none()
    );
    expect(pressField(field, "Backspace", { shiftKey: true })).toStrictEqual(
      Option.none()
    );
    expect(pressField(field, "Backspace", {}, true)).toStrictEqual(
      Option.none()
    );
    expect(pressField(row, "Backspace")).toStrictEqual(Option.none());
  });

  it("keeps a key an IME is composing from the field's own handler", async () => {
    const card = await render(opened);
    const field = fieldOf(card);
    const heard: string[] = [];

    const hear = (event: KeyboardEvent): void => {
      heard.push(event.key);
    };

    field.addEventListener("keydown", hear);
    card.addEventListener("keydown", guard, { capture: true });

    field.dispatchEvent(keydown("Enter", { isComposing: true }));
    field.dispatchEvent(keydown("ArrowDown", { isComposing: true }));
    field.dispatchEvent(keydown("ArrowDown"));

    expect(heard).toStrictEqual(["ArrowDown"]);
  });

  it("keeps focus in the field on a press on a row, and nowhere else", async () => {
    const card = await render(opened);
    const row = card.querySelector('[data-value="status"]');

    if (row === null) {
      throw new Error("The rendered palette has no status row.");
    }

    const pressOn = (target: Element): boolean => {
      const event = new MouseEvent("mousedown", {
        bubbles: true,
        cancelable: true,
      });

      expect(
        readDuringDispatch(target, event, rowPress, { listenOn: card })
      ).toStrictEqual(Option.none());

      return event.defaultPrevented;
    };

    expect(pressOn(row)).toBe(true);
    expect(pressOn(fieldOf(card))).toBe(false);
  });
});

const collect = async <A>(
  stream: Stream.Stream<A>,
  count: number,
  act: () => void
): Promise<readonly A[]> => {
  const collected: A[] = [];
  let isEnded = false;

  const fiber = Effect.runFork(
    Stream.runForEach(stream, (message) =>
      Effect.sync(() => collected.push(message))
    ).pipe(Effect.ensuring(Effect.sync(() => (isEnded = true))))
  );

  const isProbe = (message: A): boolean =>
    Equal.equals(message, earlyArrow("ArrowUp"));

  const pressed = (): readonly A[] =>
    Array.filter(collected, (message) => !isProbe(message));

  try {
    await settleUntil(() => {
      window.dispatchEvent(keydown("ArrowUp"));

      return isEnded || Array.some(collected, isProbe);
    });
    act();
    await settleUntil(() => isEnded || pressed().length >= count);

    return pressed();
  } finally {
    await Effect.runPromise(Fiber.interrupt(fiber));
  }
};

const earlyKeysOf = (model: CommandPalette.Model) => {
  const entry = CommandPalette.subscriptions("palette").paletteEarlyKeys;

  return entry.dependenciesToStream(entry.modelToDependencies(model));
};

const pressOn = (
  target: Element,
  key: string,
  init: KeyboardEventInit = {},
  isHandled = false
) =>
  readDuringDispatch(
    target,
    keydown(key, init),
    (event) => earlyKey("palette", event),
    {
      listenOn: window,
      isHandled,
      isCapture: true,
    }
  );

describe("CommandPalette keys before the field has focus", () => {
  it("takes the arrows and Enter pressed as it opens, before the page's own bindings", async () => {
    document.body.innerHTML = '<button id="page-row">row</button>';
    const pageRow = byId("page-row");

    const pageKeys: string[] = [];

    const onPageKey = (event: KeyboardEvent): void => {
      pageKeys.push(event.key);
    };

    document.addEventListener("keydown", onPageKey);
    const prevented: boolean[] = [];

    const press = (key: string): void => {
      const event = keydown(key);
      pageRow.dispatchEvent(event);
      prevented.push(event.defaultPrevented);
    };

    const messages = await collect(earlyKeysOf(opened), 4, () => {
      press("ArrowDown");
      press("ArrowDown");
      press("ArrowDown");
      press("j");
      press("Enter");
    });

    document.removeEventListener("keydown", onPageKey);
    const card = await render(pressAll(opened, Array.take(messages, 3)));

    expect(messages).toStrictEqual([
      ...Array.replicate(earlyArrow("ArrowDown"), 3),
      Message.PressedEarlyEnter(),
    ]);
    expect(prevented).toStrictEqual([true, true, true, false, true]);
    expect(pageKeys).toStrictEqual(["j"]);
    expect(bySelector('[aria-selected="true"]', card).dataset["value"]).toBe(
      "keys"
    );
  });

  it("leaves keys inside the palette to its field, and composing, modified and handled keys", async () => {
    const card = await render(opened);
    const field = fieldOf(card);

    expect(pressOn(document.body, "ArrowUp")).toStrictEqual(
      Option.some(earlyArrow("ArrowUp"))
    );
    expect(pressOn(field, "ArrowDown")).toStrictEqual(Option.none());
    expect(
      pressOn(document.body, "ArrowDown", { isComposing: true })
    ).toStrictEqual(Option.none());
    expect(
      pressOn(document.body, "ArrowDown", { shiftKey: true })
    ).toStrictEqual(Option.none());
    expect(pressOn(document.body, "Home")).toStrictEqual(Option.none());
  });

  it("listens only while open, keyed behind the parent's prefix", async () => {
    const whileClosed = await collect(earlyKeysOf(closed), 1, () => {
      document.body.dispatchEvent(keydown("ArrowDown"));
    });

    expect(whileClosed).toStrictEqual([]);
    expect(Object.keys(CommandPalette.subscriptions("palette"))).toStrictEqual([
      "paletteEarlyKeys",
    ]);
  });
});

const paletteView =
  (viewInputs: Partial<CommandPalette.ViewInputs> = {}) =>
  (model: CommandPalette.Model, h: HtmlBuilder<Message>) =>
    CommandPalette.view(
      model,
      {
        commands: COMMANDS,
        scope: "Renew the certificate",
        noun: "item",
        ...viewInputs,
      },
      h
    );

const resolveSceneScroll = Scene.Command.resolve(
  CommandPalette.ScrollToCursor,
  Message.CompletedScrollToCursor()
);

const resolveSceneFocus = Scene.Command.resolve(
  Focus.Focus,
  Message.CompletedFocus()
);

const acquireResources = Scene.Mount.resolve(
  UiDialog.AcquireResources,
  UiDialog.Message.SucceededAcquireResources()
);

const bindKeys = (maybeShownPage: Option.Option<string>) =>
  Scene.Mount.resolve(
    BindPaletteKeys,
    Message.PressedBackspace({ maybeShownPage })
  );

const mountPalette = [acquireResources, bindKeys(ON_COMMANDS)] as const;

const field = Scene.role("combobox");

const rowOf = (label: string) =>
  Scene.role("option", { name: new RegExp(`^${label}`, "u") });

const down = [Scene.keydown(field, "ArrowDown"), resolveSceneScroll] as const;
const up = [Scene.keydown(field, "ArrowUp"), resolveSceneScroll] as const;
const nothingFound = modifyFields(opened, { query: () => "zzzz" });

const openStatus = [
  Scene.click(rowOf("Change status")),
  resolveSceneFocus,
  resolveSceneScroll,
] as const;

describe("CommandPalette view", () => {
  it("is a dialog named Commands: a combobox over a listbox, the cursor its active row", () => {
    Scene.scene(
      { update: CommandPalette.update, view: paletteView() },
      Scene.given(opened),
      ...mountPalette,
      Scene.expect(Scene.role("dialog", { name: "Commands" })).toExist(),
      Scene.expect(field).toHaveAttr("aria-label", "Command or item"),
      Scene.expect(field).toHaveAttr("aria-expanded", "true"),
      Scene.expect(field).toHaveAttr("aria-controls", "palette-list"),
      Scene.expect(field).toHaveAttr(
        "aria-activedescendant",
        "palette-option-0"
      ),
      Scene.expect(field).toHaveAttr("data-foldkit-dialog-initial-focus"),
      Scene.expect(Scene.role("listbox", { name: "Results" })).toExist(),
      Scene.expect(rowOf("Edit item")).toHaveAttr("aria-selected", "true"),
      Scene.expect(rowOf("Edit item")).toHaveAttr("role", "option"),
      Scene.expect(rowOf("Change status")).toHaveAttr("aria-selected", "false"),
      Scene.expect(Scene.role("group", { name: "Item" })).toExist(),
      Scene.expect(Scene.selector(".palette-scope")).toHaveText(
        "Renew the certificate"
      ),
      Scene.expect(Scene.selector(".palette-row .glyph.opens")).toExist(),
      Scene.expect(Scene.selector('.palette [role="status"]')).toHaveText("")
    );
  });

  it("marks a row that cannot run, its reason in place of the hint", () => {
    Scene.scene(
      { update: CommandPalette.update, view: paletteView() },
      Scene.given(opened),
      ...mountPalette,
      Scene.expect(rowOf("Archive")).toHaveAttr("aria-disabled", "true"),
      Scene.expect(Scene.selector('[data-value="archive"] .hint')).toHaveText(
        "Saving…"
      ),
      Scene.expect(rowOf("Archive")).not.toHaveHandler("click")
    );
  });

  it("moves the cursor a row at a time with ↓ and ↑ from the field, stopping at the ends", () => {
    Scene.scene(
      { update: CommandPalette.update, view: paletteView() },
      Scene.given(opened),
      ...mountPalette,
      Scene.keydown(field, "ArrowUp"),
      Scene.expectHandled(),
      resolveSceneScroll,
      Scene.expect(rowOf("Edit item")).toHaveAttr("aria-selected", "true"),
      ...down,
      Scene.expect(rowOf("Change status")).toHaveAttr("aria-selected", "true"),
      Scene.expect(rowOf("Edit item")).toHaveAttr("aria-selected", "false"),
      ...down,
      ...down,
      ...down,
      ...down,
      Scene.expect(rowOf("Keyboard shortcuts")).toHaveAttr(
        "aria-selected",
        "true"
      ),
      Scene.expect(field).toHaveAttr(
        "aria-activedescendant",
        "palette-option-3"
      ),
      ...up,
      Scene.expect(rowOf("Archive")).toHaveAttr("aria-selected", "true")
    );
  });

  it("steps through the rows the query finds, from its first", () => {
    Scene.scene(
      { update: CommandPalette.update, view: paletteView() },
      Scene.given(opened),
      ...mountPalette,
      ...down,
      Scene.type(field, "e"),
      resolveSceneScroll,
      Scene.expect(rowOf("Edit item")).toHaveAttr("aria-selected", "true"),
      Scene.expect(Scene.selector('.palette [role="status"]')).toHaveText(
        "5 results."
      ),
      Scene.expect(rowOf("Renew the certificate")).toExist(),
      ...down,
      ...down,
      Scene.expect(rowOf("Archive")).toHaveAttr("aria-selected", "true")
    );
  });

  it("leaves Home, End and a modified key to the field, and takes its keys with nothing listed", () => {
    Scene.scene(
      { update: CommandPalette.update, view: paletteView() },
      Scene.given(opened),
      ...mountPalette,
      Scene.keydown(field, "Home"),
      Scene.expectIgnored(),
      Scene.keydown(field, "End"),
      Scene.expectIgnored(),
      Scene.keydown(field, "ArrowDown", { shiftKey: true }),
      Scene.expectIgnored(),
      Scene.keydown(field, "Enter", { metaKey: true }),
      Scene.expectIgnored(),
      Scene.expect(rowOf("Edit item")).toHaveAttr("aria-selected", "true")
    );
    Scene.scene(
      { update: CommandPalette.update, view: paletteView() },
      Scene.given(nothingFound),
      ...mountPalette,
      Scene.keydown(field, "ArrowDown"),
      Scene.expectHandled(),
      Scene.keydown(field, "Enter"),
      Scene.expectHandled()
    );
  });

  it("runs the cursor's row on Enter from the field, closing first", () => {
    Scene.scene(
      { update: CommandPalette.update, view: paletteView() },
      Scene.given(opened),
      ...mountPalette,
      Scene.keydown(field, "Enter"),
      Scene.expectHandled(),
      Scene.expectOutMessage(
        CommandPalette.OutMessage.SelectedCommand({ id: "edit" })
      ),
      Scene.Command.resolve(
        UiDialog.CloseDialog,
        UiDialog.Message.CompletedCloseDialog()
      ),
      Scene.Mount.expectEnded(UiDialog.AcquireResources, BindPaletteKeys)
    );
  });

  it("opens a page with Back, the scope and its title, the current choice tagged and held", () => {
    Scene.scene(
      { update: CommandPalette.update, view: paletteView() },
      Scene.given(opened),
      ...mountPalette,
      ...openStatus,
      Scene.expect(rowOf("To do")).toHaveAttr("aria-selected", "true"),
      ...down,
      Scene.expect(Scene.role("button", { name: "Back" })).toExist(),
      Scene.expect(Scene.selector(".palette-title")).toHaveText("Status"),
      Scene.expect(field).toHaveAttr("aria-label", "Status"),
      Scene.expect(field).toHaveAttr("placeholder", "type to narrow"),
      Scene.expect(rowOf("In progress")).toHaveAttr("aria-selected", "true"),
      Scene.expect(rowOf("To do")).toHaveAttr("aria-disabled", "true"),
      Scene.expect(Scene.selector('[data-value="todo"] .tag')).toHaveText(
        "current"
      ),
      Scene.click(rowOf("Done")),
      Scene.expectOutMessage(
        CommandPalette.OutMessage.SelectedChoice({
          commandId: "status",
          choiceId: "done",
        })
      ),
      Scene.expect(Scene.role("listbox", { name: "Status" })).toHaveAttr(
        "aria-busy",
        "true"
      ),
      Scene.expect(Scene.selector('[data-value="done"] .cursor')).toExist(),
      Scene.expect(field).toHaveAttr("readOnly", "true"),
      Scene.expect(Scene.role("button", { name: "Back" })).toHaveAttr(
        "aria-disabled",
        "true"
      ),
      Scene.keydown(field, "ArrowUp"),
      Scene.expectIgnored(),
      Scene.keydown(field, "Enter"),
      Scene.expectIgnored()
    );
  });

  it("indents a tree page's choices and mutes the ones a query keeps for their place, which still pick", () => {
    const placeCommands: readonly Command[] = [
      { id: "move", label: "Move to", group: "Item", page: PLACES },
    ];

    Scene.scene(
      {
        update: CommandPalette.update,
        view: paletteView({ commands: placeCommands }),
      },
      Scene.given(opened),
      ...mountPalette,
      Scene.click(rowOf("Move to")),
      resolveSceneFocus,
      resolveSceneScroll,
      Scene.expect(rowOf("Website")).toHaveAttr("aria-selected", "true"),
      Scene.expect(rowOf("Website")).toHaveStyle("--palette-level", "2"),
      Scene.expect(rowOf("Website")).not.toHaveClass("context"),
      Scene.type(field, "lau"),
      resolveSceneScroll,
      Scene.expect(rowOf("Launch")).toHaveAttr("aria-selected", "true"),
      Scene.expect(rowOf("Launch")).toHaveStyle("--palette-level", "3"),
      Scene.expect(rowOf("Launch")).not.toHaveClass("context"),
      Scene.expect(rowOf("Projects")).toHaveStyle("--palette-level", "1"),
      Scene.expect(rowOf("Projects")).toHaveClass("context"),
      Scene.expect(rowOf("Projects \\(context\\)")).toExist(),
      Scene.expect(Scene.selector('.palette [role="status"]')).toHaveText(
        "1 result."
      ),
      Scene.expect(rowOf("Website")).toHaveClass("context"),
      Scene.expect(rowOf("Website")).toHaveAttr("aria-disabled", "true"),
      Scene.expect(rowOf("Garden")).toBeAbsent(),
      Scene.click(rowOf("Projects")),
      Scene.expectOutMessage(
        CommandPalette.OutMessage.SelectedChoice({
          commandId: "move",
          choiceId: "projects",
        })
      )
    );
  });

  it("goes back on Backspace in a page's empty field", () => {
    Scene.scene(
      { update: CommandPalette.update, view: paletteView() },
      Scene.given(onStatus),
      acquireResources,
      bindKeys(ON_STATUS),
      resolveSceneFocus,
      resolveSceneScroll,
      Scene.expect(Scene.selector(".palette-title")).toBeAbsent(),
      Scene.expect(rowOf("Edit item")).toHaveAttr("aria-selected", "true")
    );
  });

  it("says when nothing matches, and shows the application's detail and live region", () => {
    Scene.scene(
      {
        update: CommandPalette.update,
        view: (model: CommandPalette.Model, h: HtmlBuilder<Message>) =>
          paletteView({
            toDetailView: () => [h.p([h.Class("why")], ["Reconnect to save."])],
            toLiveRegionView: () => h.div([h.Role("status"), h.Class("live")]),
          })(model, h),
      },
      Scene.given(nothingFound),
      ...mountPalette,
      Scene.expect(Scene.selector(".palette-list")).toContainText(
        "nothing matches"
      ),
      Scene.expect(Scene.selector('.palette [role="status"]')).toHaveText(
        "Nothing matches."
      ),
      Scene.expect(field).not.toHaveAttr("aria-activedescendant"),
      Scene.expect(Scene.selector(".palette-detail .why")).toExist(),
      Scene.expect(Scene.selector("dialog .live")).toExist(),
      Scene.expect(Scene.selector(".veil-pad .live")).toBeAbsent()
    );
  });
});
