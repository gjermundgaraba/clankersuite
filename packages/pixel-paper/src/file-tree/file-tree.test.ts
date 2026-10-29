import { Number, Option, Schema } from "effect";
import { Scene, Story } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";
import * as Update from "foldkit/update";
import { afterEach, describe, expect, it } from "vite-plus/test";

import { disposeEmbedded, embed } from "../test/embed.ts";
import { keydown } from "../test/events.ts";
import { bySelector } from "../test/fixture.ts";
import { settle, settleUntil } from "../test/settle.ts";
import * as FileTree from "./file-tree.ts";

const NODES: readonly FileTree.FileNode[] = [
  {
    name: "config",
    path: "config",
    children: [
      { name: "app.toml", path: "config/app.toml", tag: "main" },
      {
        name: "keys",
        path: "config/keys",
        children: [{ name: "a.pem", path: "config/keys/a.pem" }],
      },
    ],
  },
  { name: "README.md", path: "README.md" },
];

const fresh = FileTree.init({ id: "files", folded: ["config/keys"] });

describe("FileTree update", () => {
  it("folds and opens folders, and reports a chosen file", () => {
    Story.story(
      FileTree.update,
      Story.given(fresh),
      Story.message(FileTree.Message.ClickedFolder({ path: "config/keys" })),
      Story.model((model) => {
        expect(model.foldedPaths).not.toContain("config/keys");
      }),
      Story.message(FileTree.Message.PressedCloseFolderKey({ path: "config" })),
      Story.model((model) => {
        expect(model.foldedPaths).toContain("config");
      }),
      Story.message(FileTree.Message.PressedOpenFolderKey({ path: "config" })),
      Story.model((model) => {
        expect(model.foldedPaths).not.toContain("config");
      }),
      Story.message(FileTree.Message.ClickedFile({ path: "README.md" })),
      Story.expectOutMessage(
        FileTree.OutMessage.OpenedFile({ path: "README.md" })
      )
    );
  });
});

const treeView = (model: FileTree.Model, h: HtmlBuilder<FileTree.Message>) =>
  FileTree.view(
    model,
    { label: "Files in config", nodes: NODES, currentPath: "config/app.toml" },
    h
  );

const item = (name: string) => Scene.role("treeitem", { name });

const bindKeys = Scene.Mount.resolve(
  FileTree.BindTreeKeys,
  FileTree.Message.FocusedTreeItem({ path: "config" })
);

describe("FileTree view", () => {
  it("is a named tree of levelled items, the open file current and a shut folder's children gone", () => {
    Scene.scene(
      { update: FileTree.update, view: treeView },
      Scene.given(fresh),
      bindKeys,
      Scene.expect(Scene.role("tree", { name: "Files in config" })).toExist(),
      Scene.expect(item("config/")).toHaveAttr("aria-expanded", "true"),
      Scene.expect(item("config/")).toHaveAttr("aria-level", "1"),
      Scene.expect(item("config/")).toHaveAttr(
        "aria-owns",
        "files-group-config"
      ),
      Scene.expect(Scene.role("group")).toHaveId("files-group-config"),
      Scene.expect(item("app.toml main")).toHaveAttr("aria-current", "true"),
      Scene.expect(item("app.toml main")).toHaveAttr("aria-level", "2"),
      Scene.expect(item("app.toml main")).toHaveAttr("aria-posinset", "1"),
      Scene.expect(item("app.toml main")).toHaveAttr("aria-setsize", "2"),
      Scene.expect(item("keys/")).toHaveAttr("aria-expanded", "false"),
      Scene.expect(item("a.pem")).toBeAbsent(),
      Scene.expect(item("README.md")).not.toHaveAttr("aria-current")
    );
  });

  it("opens a folder on a press and reports a pressed file", () => {
    Scene.scene(
      { update: FileTree.update, view: treeView },
      Scene.given(fresh),
      bindKeys,
      Scene.click(item("keys/")),
      Scene.expect(item("keys/")).toHaveAttr("aria-expanded", "true"),
      Scene.expect(item("a.pem")).toHaveAttr("aria-level", "3"),
      Scene.click(item("README.md")),
      Scene.expectOutMessage(
        FileTree.OutMessage.OpenedFile({ path: "README.md" })
      )
    );
  });
});

const Harness = Schema.Struct({
  tree: FileTree.Model,
  currentPath: Schema.String,
  focusReports: Schema.Finite,
});

type Harness = typeof Harness.Type;

const HarnessMessage = defineMessageUnion({
  GotFileTreeMessage: { message: FileTree.Message },
});

type HarnessMessage = typeof HarnessMessage.Type;

const foldTree = Update.foldChild({
  update: FileTree.update,
  read: (model: Harness) => Option.some(model.tree),
  write: (model: Harness, nextTree: FileTree.Model): Harness =>
    modifyFields(model, { tree: () => nextTree }),
  toParentMessage: (message: FileTree.Message) =>
    HarnessMessage.GotFileTreeMessage({ message }),
  foldOutMessage: FileTree.OutMessage.match<
    Update.Step<Harness, HarnessMessage>
  >({
    OpenedFile:
      ({ path }) =>
      (model) => ({ model: modifyFields(model, { currentPath: () => path }) }),
  }),
});

const isFocusReport = Schema.is(FileTree.Message.FocusedTreeItem);

const countFocusReport = (
  model: Harness,
  treeMessage: FileTree.Message
): Harness =>
  isFocusReport(treeMessage)
    ? modifyFields(model, { focusReports: Number.increment })
    : model;

const harnessUpdate = (model: Harness, message: HarnessMessage) =>
  HarnessMessage.match<Update.Return<Harness, HarnessMessage>>(message, {
    GotFileTreeMessage: ({ message: treeMessage }) =>
      foldTree(countFocusReport(model, treeMessage), treeMessage),
  });

const harnessView = (model: Harness, h: HtmlBuilder<HarnessMessage>) =>
  h.div(
    [h.DataAttribute("focus-reports", `${model.focusReports}`)],
    [
      h.submodel({
        slotId: FileTree.id(model.tree),
        model: model.tree,
        view: FileTree.view,
        viewInputs: {
          label: "Files",
          nodes: NODES,
          currentPath: model.currentPath,
        },
        toParentMessage: (message) =>
          HarnessMessage.GotFileTreeMessage({ message }),
      }),
      h.input([h.Id("outside")]),
    ]
  );

const mountTree = async (): Promise<void> => {
  embed({
    Model: Harness,
    init: () => ({
      model: { tree: fresh, currentPath: "config/app.toml", focusReports: 0 },
    }),
    update: harnessUpdate,
    view: harnessView,
  });
  await settleUntil(() => document.querySelector('[role="tree"]') !== null);
};

const byPath = (path: string): HTMLElement =>
  bySelector(`[data-path="${path}"]`);

const press = async (
  key: string,
  init: KeyboardEventInit = {}
): Promise<KeyboardEvent> => {
  const event = keydown(key, init);
  const target = document.activeElement ?? document.body;
  target.dispatchEvent(event);
  await settle();

  return event;
};

const focusedPath = (): string | undefined =>
  document.activeElement instanceof HTMLElement
    ? document.activeElement.dataset["path"]
    : undefined;

const tabStops = (): ReadonlyArray<string | undefined> =>
  globalThis.Array.from(
    document.querySelectorAll('[role="treeitem"][tabindex="0"]'),
    (treeItem) =>
      treeItem instanceof HTMLElement ? treeItem.dataset["path"] : undefined
  );

const focusReports = (): string | undefined =>
  bySelector("[data-focus-reports]").dataset["focusReports"];

const focusOn = async (path: string): Promise<void> => {
  byPath(path).focus();
  await settle();
};

describe("FileTree keys", () => {
  afterEach(disposeEmbedded);

  it("starts with one Tab stop, the open file, and moves it to where focus lands", async () => {
    await mountTree();

    expect(tabStops()).toStrictEqual(["config/app.toml"]);

    await focusOn("README.md");

    expect(tabStops()).toStrictEqual(["README.md"]);
    expect(focusReports()).toBe("1");
  });

  it("moves down and up through the visible items and to the ends, reporting each once", async () => {
    await mountTree();
    await focusOn("config");

    const down = await press("ArrowDown");
    expect(focusedPath()).toBe("config/app.toml");
    expect(down.defaultPrevented).toBe(true);
    expect(tabStops()).toStrictEqual(["config/app.toml"]);
    expect(focusReports()).toBe("2");

    await press("ArrowUp");
    expect(focusedPath()).toBe("config");

    await press("End");
    expect(focusedPath()).toBe("README.md");

    await press("Home");
    expect(focusedPath()).toBe("config");
    expect(focusReports()).toBe("5");
  });

  it("opens a shut folder with Right, steps into it, and shuts it with Left", async () => {
    await mountTree();
    await focusOn("config/keys");

    const open = await press("ArrowRight");
    expect(open.defaultPrevented).toBe(true);
    expect(byPath("config/keys").getAttribute("aria-expanded")).toBe("true");

    await press("ArrowRight");
    expect(focusedPath()).toBe("config/keys/a.pem");

    await press("ArrowLeft");
    expect(focusedPath()).toBe("config/keys");

    await press("ArrowLeft");
    expect(byPath("config/keys").getAttribute("aria-expanded")).toBe("false");
    expect(
      document.querySelector('[data-path="config/keys/a.pem"]')
    ).toBeNull();
  });

  it("goes to the next item whose name starts with a typed letter, wrapping round", async () => {
    await mountTree();
    await focusOn("config");

    await press("r");
    expect(focusedPath()).toBe("README.md");

    await press("C");
    expect(focusedPath()).toBe("config");
  });

  it("leaves a key at an end, with a modifier, while composing or once handled", async () => {
    await mountTree();
    await focusOn("README.md");

    const atEnd = await press("ArrowDown");
    expect(atEnd.defaultPrevented).toBe(false);
    expect(focusedPath()).toBe("README.md");

    const modified = await press("ArrowUp", { shiftKey: true });
    expect(modified.defaultPrevented).toBe(false);
    const composing = await press("ArrowUp", { isComposing: true });
    expect(composing.defaultPrevented).toBe(false);
    expect(focusedPath()).toBe("README.md");

    byPath("README.md").addEventListener(
      "keydown",
      (event) => {
        event.preventDefault();
      },
      {
        once: true,
      }
    );
    await press("ArrowUp");
    expect(focusedPath()).toBe("README.md");
  });

  it("chooses a file with a press, making it current", async () => {
    await mountTree();
    await focusOn("README.md");

    byPath("README.md").click();
    await settle();

    expect(byPath("README.md").getAttribute("aria-current")).toBe("true");
  });
});
