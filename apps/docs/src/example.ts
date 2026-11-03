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

const PROGRAMS = import.meta.glob<ExampleModule>([
  "../../../packages/*/src/*/examples/*.ts",
  "./foundations/*/examples/*.ts",
  "!../../../packages/*/src/*/examples/*.test.ts",
  "!./foundations/*/examples/*.test.ts",
]);

const SOURCES = import.meta.glob<string>(
  [
    "../../../packages/*/src/*/examples/*.ts",
    "./foundations/*/examples/*.ts",
    "!../../../packages/*/src/*/examples/*.test.ts",
    "!./foundations/*/examples/*.test.ts",
  ],
  {
    eager: true,
    query: "?raw",
    import: "default",
  }
);

export const examplePath = (directory: string, name: string): string =>
  `${directory}/examples/${name}.ts`;

export const sourceOf = (
  directory: string,
  name: string
): Option.Option<string> => Record.get(SOURCES, examplePath(directory, name));

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
  args: { directory: Schema.String, name: Schema.String },
  messages: [Message.CompletedMountExample],
  execute: ({ element, directory, name }) =>
    Effect.gen(function* () {
      const load = Record.get(PROGRAMS, examplePath(directory, name));

      if (Option.isNone(load)) {
        return Message.CompletedMountExample();
      }

      const module = yield* Effect.promise(load.value);

      yield* Effect.acquireRelease(
        Effect.sync(() => {
          const container = document.createElement("div");
          container.id = `example-${Array.join(
            Array.filter(
              directory.split("/"),
              (part) => !/^\.{1,2}$/u.test(part)
            ),
            "-"
          )}-${name}`;
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

/** Every example file, by its path. */
export const EXAMPLES_ON_DISK: readonly string[] = Record.keys(SOURCES);
