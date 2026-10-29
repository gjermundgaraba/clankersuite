import { Effect, Option, Stream } from "effect";
import { Scene } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";

import { MermaidMissing, drawDiagram } from "./diagram.ts";
import * as Mermaid from "./mermaid.ts";

const Message = defineMessageUnion({
  GotDiagramMessage: { message: Mermaid.Message },
});

type Message = typeof Message.Type;

const SOURCE =
  "flowchart LR\n  accTitle: Sign-in\n  accDescr: A form, then the inbox.\n  a --> b";

const update = (_model: string, message: Message) => ({
  model: Mermaid.Message.match(message.message, {
    SucceededDrawDiagram: ({ palette }) => `drawn in ${palette}`,
    FailedLoadMermaid: ({ reason }) => `no mermaid: ${reason}`,
    FailedDrawDiagram: ({ reason }) => `failed: ${reason}`,
  }),
});

const diagramView = (model: string, h: HtmlBuilder<Message>) =>
  h.div(
    [],
    [
      Mermaid.view(
        {
          source: SOURCE,
          palette: "Plum",
          toParentMessage: (message) => Message.GotDiagramMessage({ message }),
        },
        h
      ),
      h.p([h.Class("state")], [model]),
    ]
  );

const resolveDraw = (message: Mermaid.Message) =>
  Scene.Mount.resolve(
    { name: Mermaid.DrawDiagram.name },
    Message.GotDiagramMessage({ message })
  );

describe("Mermaid adapter view", () => {
  it("renders an empty box that reports its drawing through the caller", () => {
    Scene.scene(
      { update, view: diagramView },
      Scene.given("drawing"),
      Scene.expect(Scene.selector(".diagram")).toHaveText(""),
      resolveDraw(Mermaid.Message.SucceededDrawDiagram({ palette: "Plum" })),
      Scene.expect(Scene.selector(".state")).toHaveText("drawn in Plum")
    );
  });
});

const COLOUR_TOKENS = [
  "--ink",
  "--paper",
  "--head",
  "--rule",
  "--muted",
  "--red",
  "--on-head",
];

const reasonOf = (message: Mermaid.Message): string =>
  "reason" in message ? message.reason : "";

const draw = async (source: string): Promise<Mermaid.Message> => {
  const box = document.createElement("div");
  document.body.append(box);

  const maybeMessage = await Effect.runPromise(
    Stream.runHead(
      Mermaid.DrawDiagram({ source, palette: "Paper" }).f(box, Stream.empty)
    )
  );

  box.remove();

  return Option.getOrThrow(maybeMessage);
};

describe("Mermaid adapter DrawDiagram", () => {
  beforeEach(() => {
    Object.defineProperty(document, "fonts", {
      configurable: true,
      value: { load: async () => [] },
    });

    for (const token of COLOUR_TOKENS) {
      document.documentElement.style.setProperty(token, "rgb(10, 20, 30)");
    }

    document.documentElement.style.setProperty("--type-body", "13px");
  });

  afterEach(() => {
    Reflect.deleteProperty(document, "fonts");
    document.documentElement.removeAttribute("style");
  });

  it("reports a source that does not parse as a failed draw, with mermaid's whole message", async () => {
    const message = await draw("flowchart LR\n  start[Start --> end");

    expect(message).toMatchObject({
      _tag: "FailedDrawDiagram",
      palette: "Paper",
    });
    expect(reasonOf(message)).toMatch(
      /^Parse error on line \d+:\n.*start\[Start --> end\n-+\^\nExpecting /u
    );
  });

  it("reports mermaid that does not load apart from a diagram that does not draw", async () => {
    const missing = Effect.fail(
      new MermaidMissing({ reason: "Cannot find package 'mermaid'" })
    );

    const message = await Effect.runPromise(
      drawDiagram(missing)({
        element: document.createElement("div"),
        source: SOURCE,
        palette: "Paper",
      })
    );

    expect(message).toStrictEqual(
      Mermaid.Message.FailedLoadMermaid({
        palette: "Paper",
        reason: "Cannot find package 'mermaid'",
      })
    );
  });
});
