import { Button as UiButton } from "@foldkit/ui";
import {
  Array,
  Data,
  Effect,
  Match,
  Option,
  Queue,
  Schema,
  Stream,
  pipe,
} from "effect";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import * as Mount from "foldkit/mount";
import { modifyFields } from "foldkit/struct";
import { defineView } from "foldkit/submodel";
import type * as Update from "foldkit/update";

import type { Attributes } from "../attributes/attributes.ts";
import * as Glyph from "../glyph/glyph.ts";
import type { GlyphName } from "../glyph/glyphs.ts";
import { isPlain } from "../keys/keys.ts";

/** Schema for a file tree: the folders folded shut, and the item the keyboard was last on,
 *  which is the tree's one stop for Tab. */
export const Model = Schema.Struct({
  id: Schema.String,
  foldedPaths: Schema.Array(Schema.String),
  maybeFocusedPath: Schema.Option(Schema.String),
});

export type Model = typeof Model.Type;

/** Union of all Messages a file tree can produce. */
export const Message = defineMessageUnion({
  ClickedFolder: { path: Schema.String },
  ClickedFile: { path: Schema.String },
  FocusedTreeItem: { path: Schema.String },
  PressedOpenFolderKey: { path: Schema.String },
  PressedCloseFolderKey: { path: Schema.String },
});

export type Message = typeof Message.Type;

/** Union of OutMessages a file tree reports: a file was chosen (a press, Enter or Space).
 *  Show it, and pass its path back in as `currentPath`. */
export const OutMessage = defineMessageUnion({
  OpenedFile: { path: Schema.String },
});

export type OutMessage = typeof OutMessage.Type;

/** Configuration for creating a file tree with `init`. `folded` lists the folder paths that
 *  start shut; every other folder starts open. */
export type InitConfig = Readonly<{
  id: string;
  folded?: readonly string[];
}>;

/** Creates a file tree. */
export const init = (config: InitConfig): Model => ({
  id: config.id,
  foldedPaths: config.folded ?? [],
  maybeFocusedPath: Option.none(),
});

/** The file tree's id, unique in the document. */
export const id = (model: Model): string => model.id;

const isFolderOpen = (model: Model, path: string): boolean =>
  !Array.contains(model.foldedPaths, path);

const withFolder = (model: Model, path: string, isOpen: boolean): Model =>
  modifyFields(model, {
    foldedPaths: (foldedPaths) =>
      isOpen
        ? Array.filter(foldedPaths, (folded) => folded !== path)
        : Array.dedupe(Array.append(foldedPaths, path)),
  });

/** Processes a file tree Message and returns the next Model and OutMessage. */
export const update = (model: Model, message: Message) =>
  Message.match<Update.ReturnWithOutMessage<Model, Message, OutMessage>>(
    message,
    {
      ClickedFolder: ({ path }) => ({
        model: withFolder(model, path, !isFolderOpen(model, path)),
      }),
      ClickedFile: ({ path }) => ({
        model,
        outMessage: OutMessage.OpenedFile({ path }),
      }),
      FocusedTreeItem: ({ path }) => ({
        model: modifyFields(model, {
          maybeFocusedPath: () => Option.some(path),
        }),
      }),
      PressedOpenFolderKey: ({ path }) => ({
        model: withFolder(model, path, true),
      }),
      PressedCloseFolderKey: ({ path }) => ({
        model: withFolder(model, path, false),
      }),
    }
  );

const ITEM_SELECTOR = '[role="treeitem"]';
const PATH_ATTRIBUTE = "data-path";

type FocusMessage = typeof Message.FocusedTreeItem.Type;

type FoldMessage =
  | typeof Message.PressedOpenFolderKey.Type
  | typeof Message.PressedCloseFolderKey.Type;

type TreeKeyAction = Data.TaggedEnum<{
  MoveFocus: { readonly item: HTMLElement };
  Fold: { readonly message: FoldMessage };
}>;

const TreeKeyAction = Data.taggedEnum<TreeKeyAction>();

const ownItems = (tree: Element): readonly HTMLElement[] =>
  Array.filter(
    Array.fromIterable(tree.querySelectorAll<HTMLElement>(ITEM_SELECTOR)),
    (item) => item.closest('[role="tree"]') === tree
  );

const pathOf = (item: Element): Option.Option<string> =>
  Option.fromNullishOr(item.getAttribute(PATH_ATTRIBUTE));

const levelOf = (item: Element): number =>
  Number(item.getAttribute("aria-level") ?? "1");

const nameOf = (item: Element): string =>
  (item.querySelector(".name")?.textContent ?? "").trim().toLowerCase();

const isTypeahead = (event: KeyboardEvent): boolean =>
  event.key.length === 1 &&
  event.key !== " " &&
  !event.altKey &&
  !event.ctrlKey &&
  !event.metaKey;

const parentItem = (
  items: readonly HTMLElement[],
  index: number
): Option.Option<HTMLElement> =>
  pipe(
    Array.get(items, index),
    Option.flatMap((item) =>
      Array.findLast(
        Array.take(items, index),
        (candidate) => levelOf(candidate) === levelOf(item) - 1
      )
    )
  );

const itemStartingWith = (
  items: readonly HTMLElement[],
  index: number,
  letter: string
): Option.Option<HTMLElement> =>
  Array.findFirst(
    [...Array.drop(items, index + 1), ...Array.take(items, index + 1)],
    (item) => nameOf(item).startsWith(letter.toLowerCase())
  );

const moveTo = (
  maybeItem: Option.Option<HTMLElement>
): Option.Option<TreeKeyAction> =>
  Option.map(maybeItem, (item) => TreeKeyAction.MoveFocus({ item }));

const fold = (
  item: HTMLElement,
  isOpen: boolean,
  toMessage: (path: string) => FoldMessage
): Option.Option<TreeKeyAction> =>
  Option.map(
    Option.filter(
      pathOf(item),
      () => item.getAttribute("aria-expanded") === (isOpen ? "true" : "false")
    ),
    (path) => TreeKeyAction.Fold({ message: toMessage(path) })
  );

const actOnKey = (
  items: readonly HTMLElement[],
  index: number,
  item: HTMLElement,
  key: string
): Option.Option<TreeKeyAction> =>
  Match.value(key).pipe(
    Match.withReturnType<Option.Option<TreeKeyAction>>(),
    Match.when("ArrowDown", () => moveTo(Array.get(items, index + 1))),
    Match.when("ArrowUp", () => moveTo(Array.get(items, index - 1))),
    Match.when("Home", () => moveTo(Array.head(items))),
    Match.when("End", () => moveTo(Array.last(items))),
    Match.when("ArrowRight", () =>
      Option.orElse(
        fold(item, false, (path) => Message.PressedOpenFolderKey({ path })),
        () =>
          item.getAttribute("aria-expanded") === "true"
            ? moveTo(
                Option.filter(
                  Array.get(items, index + 1),
                  (next) => levelOf(next) === levelOf(item) + 1
                )
              )
            : Option.none()
      )
    ),
    Match.when("ArrowLeft", () =>
      Option.orElse(
        fold(item, true, (path) => Message.PressedCloseFolderKey({ path })),
        () => moveTo(parentItem(items, index))
      )
    ),
    Match.orElse(() => Option.none())
  );

const moveInTree = (
  tree: Element,
  event: KeyboardEvent
): Option.Option<TreeKeyAction> => {
  if (event.isComposing || event.defaultPrevented) {
    return Option.none();
  }

  const items = ownItems(tree);

  return pipe(
    Array.findFirstWithIndex(items, (item) => item === event.target),
    Option.flatMap(([item, index]) => {
      if (isTypeahead(event)) {
        return moveTo(itemStartingWith(items, index, event.key));
      } else if (isPlain(event)) {
        return actOnKey(items, index, item, event.key);
      }

      return Option.none();
    })
  );
};

const focusInMessage = (event: Event): Option.Option<FocusMessage> =>
  Option.map(
    Option.flatMap(
      Option.liftPredicate(event.target, (target) => target instanceof Element),
      (target) =>
        Option.flatMap(
          Option.fromNullishOr(target.closest(ITEM_SELECTOR)),
          pathOf
        )
    ),
    (path) => Message.FocusedTreeItem({ path })
  );

/** The tree's keys (see `moveInTree`), and the item focus lands on (see `focusInMessage`),
 *  which becomes the tree's stop for Tab. A key that moves focus reports nothing itself: the
 *  item's `focusin` does, once. Attached to the tree by `view`. */
export const BindTreeKeys = Mount.defineStream("BindTreeKeys", {
  messages: [
    Message.FocusedTreeItem,
    Message.PressedOpenFolderKey,
    Message.PressedCloseFolderKey,
  ],
  execute: ({ element }) =>
    Stream.callback<FocusMessage | FoldMessage>((queue) => {
      const onFocusIn = (event: Event): void => {
        const maybeMessage = focusInMessage(event);

        if (Option.isSome(maybeMessage)) {
          Queue.offerUnsafe(queue, maybeMessage.value);
        }
      };

      return Effect.gen(function* () {
        yield* Effect.acquireRelease(
          Effect.sync(() => {
            const onKeyDown = (event: Event): void => {
              const maybeAction = Option.flatMap(
                Option.liftPredicate(
                  event,
                  (keyEvent) => keyEvent instanceof KeyboardEvent
                ),
                (keyEvent) => moveInTree(element, keyEvent)
              );

              if (Option.isSome(maybeAction)) {
                event.preventDefault();
                TreeKeyAction.$match(maybeAction.value, {
                  MoveFocus: ({ item }) => {
                    item.focus();
                  },
                  Fold: ({ message }) => {
                    Queue.offerUnsafe(queue, message);
                  },
                });
              }
            };

            element.addEventListener("keydown", onKeyDown);
            element.addEventListener("focusin", onFocusIn);

            return { onKeyDown };
          }),
          ({ onKeyDown }) =>
            Effect.sync(() => {
              element.removeEventListener("keydown", onKeyDown);
              element.removeEventListener("focusin", onFocusIn);
            })
        );

        return yield* Effect.never;
      });
    }),
});

/** One file or folder. */
export type FileNode = Readonly<{
  name: string;
  /** Unique across the tree: what `OpenedFile` reports. */
  path: string;
  /** A folder when present, even if empty. */
  children?: readonly FileNode[];
  /** Defaults to `page` for a file. */
  glyph?: GlyphName;
  /** A small tag after a file's name: `"main"`, `"new"`. */
  tag?: string;
}>;

/** Per-render inputs passed to `view` through `h.submodel`'s `viewInputs`. */
export type ViewInputs = Readonly<{
  /** Names the tree: `"Files in config"`. */
  label: string;
  nodes: readonly FileNode[];
  /** The open file, which prints inverted (`aria-current`). */
  currentPath?: string;
}>;

const visiblePaths = (
  model: Model,
  nodes: readonly FileNode[]
): readonly string[] =>
  Array.flatMap(nodes, (node) =>
    node.children !== undefined && isFolderOpen(model, node.path)
      ? [node.path, ...visiblePaths(model, node.children)]
      : [node.path]
  );

const tabStop = (
  model: Model,
  nodes: readonly FileNode[],
  maybeCurrentPath: Option.Option<string>
): Option.Option<string> => {
  const visible = visiblePaths(model, nodes);
  const isVisible = (path: string): boolean => Array.contains(visible, path);

  return pipe(
    Option.filter(model.maybeFocusedPath, isVisible),
    Option.orElse(() => Option.filter(maybeCurrentPath, isVisible)),
    Option.orElse(() => Array.head(visible))
  );
};

type Level = Readonly<{ level: number; nodes: readonly FileNode[] }>;

type RenderContext = Readonly<{
  model: Model;
  maybeCurrentPath: Option.Option<string>;
  maybeTabStop: Option.Option<string>;
  h: HtmlBuilder<Message>;
}>;

const groupId = (model: Model, path: string): string =>
  `${model.id}-group-${path}`;

const itemAttributes = (
  context: RenderContext,
  level: Level,
  node: FileNode,
  index: number
) => {
  const { h, maybeTabStop } = context;

  return [
    h.Role("treeitem"),
    h.AriaLevel(level.level),
    h.AriaSetsize(level.nodes.length),
    h.AriaPosinset(index + 1),
    h.DataAttribute("path", node.path),
    h.Tabindex(
      Option.exists(maybeTabStop, (path) => path === node.path) ? 0 : -1
    ),
    h.Class("file"),
  ];
};

const fileView = (
  context: RenderContext,
  level: Level,
  node: FileNode,
  index: number
): Html => {
  const { h, maybeCurrentPath } = context;

  return UiButton.view(
    {
      onClick: Message.ClickedFile({ path: node.path }),
      toView: (groups) =>
        h.button(
          [
            ...groups.button,
            ...(Option.contains(maybeCurrentPath, node.path)
              ? [h.AriaCurrent("true")]
              : []),
            ...itemAttributes(context, level, node, index),
          ],
          [
            h.span(
              [h.Class("glyph")],
              [Glyph.view({ name: node.glyph ?? "page" }, h)]
            ),
            h.span([h.Class("name")], [node.name]),
            ...(node.tag === undefined
              ? []
              : [" ", h.span([h.Class("tag")], [node.tag])]),
          ]
        ),
    },
    h
  );
};

const folderView = (
  context: RenderContext,
  level: Level,
  node: FileNode,
  index: number,
  hasGroup: boolean
): Html => {
  const { h, model } = context;
  const isOpen = isFolderOpen(model, node.path);

  return UiButton.view(
    {
      onClick: Message.ClickedFolder({ path: node.path }),
      toView: (groups) =>
        h.button(
          [
            ...groups.button,
            h.AriaExpanded(isOpen),
            ...(hasGroup ? [h.AriaOwns(groupId(model, node.path))] : []),
            ...itemAttributes(context, level, node, index),
          ],
          [
            h.span(
              [h.Class("glyph")],
              [Glyph.view({ name: isOpen ? "folder-open" : "folder" }, h)]
            ),
            h.span([h.Class("name")], [`${node.name}/`]),
          ]
        ),
    },
    h
  );
};

const branchView = (
  context: RenderContext,
  level: Level,
  listAttributes: Attributes<Message>
): Html => {
  const { h, model } = context;

  const folderAndGroup = (
    node: FileNode,
    index: number,
    children: readonly FileNode[]
  ): readonly Html[] => {
    const hasGroup =
      isFolderOpen(model, node.path) && Array.isReadonlyArrayNonEmpty(children);

    return [
      folderView(context, level, node, index, hasGroup),
      ...(hasGroup
        ? [
            branchView(context, { level: level.level + 1, nodes: children }, [
              h.Role("group"),
              h.Id(groupId(model, node.path)),
            ]),
          ]
        : []),
    ];
  };

  return h.ul(
    listAttributes,
    Array.map(level.nodes, (node, index) =>
      h.keyed("li")(
        node.path,
        [h.Role("none")],
        node.children === undefined
          ? [fileView(context, level, node, index)]
          : folderAndGroup(node, index, node.children)
      )
    )
  );
};

/**
 * Files and folders in the system monospace, nested on a 1px rule guide, as an ARIA tree:
 * `div.file-tree > ul[role="tree"]` of `button.file[role="treeitem"]` (`aria-expanded` on a
 * folder, `aria-current` on the open file), each folder's children in a `ul[role="group"]`.
 * The tree is one stop for Tab; Down, Up, Home and End move, Right opens and Left shuts a
 * folder (see `moveInTree`), and Enter, Space or a press opens a file or folds a folder.
 */
export const view = defineView<Model, Message, ViewInputs>(
  (model, viewInputs, h): Html => {
    const { label, nodes } = viewInputs;
    const maybeCurrentPath = Option.fromNullishOr(viewInputs.currentPath);

    const context: RenderContext = {
      model,
      maybeCurrentPath,
      maybeTabStop: tabStop(model, nodes, maybeCurrentPath),
      h,
    };

    return h.div(
      [h.Class("file-tree")],
      [
        branchView(context, { level: 1, nodes }, [
          h.Role("tree"),
          h.AriaLabel(label),
          h.OnMount(BindTreeKeys()),
        ]),
      ]
    );
  }
);
