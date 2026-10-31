// @vitest-environment node
import { it } from "@effect/vitest";
import { Schema } from "effect";
import { describe } from "vite-plus/test";

import { afterEmission, afterSource } from "./reconcile.ts";
import type { Pending } from "./reconcile.ts";

const Typed = Schema.Struct({ typed: Schema.Literals(["a", "b", "\n"]) });
const Deleted = Schema.Struct({ deleted: Schema.Literal(true) });

const Rendered = Schema.Struct({
  rendered: Schema.Int.check(Schema.isBetween({ minimum: 0, maximum: 3 })),
});

const Steps = Schema.Array(Schema.Union([Typed, Deleted, Rendered])).check(
  Schema.isMaxLength(40)
);

describe("reconciling a source write", () => {
  it.prop(
    "a stale emission never replaces the document, and the next echo clears what lagged",
    { steps: Steps },
    ({ steps }) => {
      let doc = "";
      let pending: Pending = [];
      let awaited: readonly string[] = [];
      let wasRewound = false;

      const emitted = (next: string) => {
        doc = next;
        pending = afterEmission(pending, next);
        awaited = [...awaited, next];
      };

      const render = (skipped: number) => {
        const stale = awaited[skipped];

        if (stale !== undefined) {
          const reconciled = afterSource(pending, stale, doc);

          wasRewound ||= reconciled.isExternal;
          ({ pending } = reconciled);
          awaited = awaited.slice(skipped + 1);
        }
      };

      for (const step of steps) {
        if ("typed" in step) {
          emitted(`${doc}${step.typed}`);
        } else if ("deleted" in step) {
          emitted(doc.slice(0, -1));
        } else {
          render(step.rendered);
        }
      }

      render(awaited.length - 1);
      emitted(`${doc}fresh`);
      render(awaited.length - 1);

      return !wasRewound && pending.length === 0;
    }
  );

  it.prop(
    "an outside value is applied and forgets what was awaited",
    {
      doc: Schema.String,
      awaited: Schema.Array(Schema.String).check(Schema.isMaxLength(4)),
    },
    ({ doc, awaited }) => {
      const pending = awaited.map((text) => `${text}typed`);
      const reconciled = afterSource(pending, `${doc} from outside`, doc);

      return reconciled.isExternal && reconciled.pending.length === 0;
    }
  );

  it.prop(
    "a stored text that differs from the document only in line endings is no change",
    { lines: Schema.Array(Schema.String).check(Schema.isMaxLength(6)) },
    ({ lines }) => {
      const doc = lines.map((text) => text.replaceAll("\r", "")).join("\n");

      return !afterSource([], doc.replaceAll("\n", "\r\n"), doc).isExternal;
    }
  );
});
