import { Array, Effect, Option, Record, Schema } from "effect";
import { Mount, Runtime } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";

import { Message } from "./message.ts";

type ProgramExample = Omit<
  Runtime.ElementConfig<unknown, Readonly<{ _tag: string }>>,
  "container"
>;

type StaticExample = Readonly<{
  view: <Message>(h: HtmlBuilder<Message>) => Html;
}>;

type ExampleModule = ProgramExample | StaticExample;

const EXAMPLES = "../../../packages/components/src";

const PROGRAMS = import.meta.glob<ExampleModule>([
  "../../../packages/components/src/*/examples/*.ts",
  "!../../../packages/components/src/*/examples/*.test.ts",
]);

const SOURCES = import.meta.glob<string>(
  [
    "../../../packages/components/src/*/examples/*.ts",
    "!../../../packages/components/src/*/examples/*.test.ts",
  ],
  {
    eager: true,
    query: "?raw",
    import: "default",
  }
);

const pathOf = (slug: string, name: string): string =>
  `${EXAMPLES}/${slug}/examples/${name}.ts`;

export const sourceOf = (slug: string, name: string): Option.Option<string> =>
  Record.get(SOURCES, pathOf(slug, name));

const StaticModel = Schema.Struct({});

const toProgram = (module: ExampleModule): ProgramExample =>
  "update" in module
    ? module
    : {
        Model: StaticModel,
        init: () => ({ model: {} }),
        update: (model) => ({ model }),
        view: (_model, h) => module.view(h),
      };

/** Runs a component's example as its own program inside the element, and stops it when
 *  the element leaves the page. */
export const MountExample = Mount.define("MountExample", {
  args: { slug: Schema.String, name: Schema.String },
  messages: [Message.CompletedMountExample],
  execute: ({ element, slug, name }) =>
    Effect.gen(function* () {
      const load = Record.get(PROGRAMS, pathOf(slug, name));

      if (Option.isNone(load)) {
        return Message.CompletedMountExample();
      }

      const module = yield* Effect.promise(load.value);

      yield* Effect.acquireRelease(
        Effect.sync(() => {
          const container = document.createElement("div");
          container.id = `example-${slug}-${name}`;
          element.replaceChildren(container);

          return Runtime.embed(
            Runtime.makeElement({ ...toProgram(module), container })
          );
        }),
        (handle) =>
          Effect.sync(() => {
            handle.dispose();
          })
      );

      return Message.CompletedMountExample();
    }),
});

const EXAMPLE_PATH = /\/(?<slug>[^/]+)\/examples\/(?<name>[^/]+)\.ts$/u;

/** Every example file, by its component's directory and its own name. */
export const EXAMPLES_ON_DISK: readonly string[] = Array.map(
  Record.keys(SOURCES),
  (path) => {
    const groups = EXAMPLE_PATH.exec(path)?.groups;

    return `${groups?.["slug"] ?? ""}/${groups?.["name"] ?? ""}`;
  }
);
