import { Array, Data, Effect, Record, Schema, Semaphore } from "effect";
import { defineMessageUnion } from "foldkit/message";
import type { Mermaid, MermaidConfig } from "mermaid";

import { Palette } from "../scheme/scheme.ts";

const COLOURS = {
  ink: "--ink",
  paper: "--paper",
  head: "--head",
  rule: "--rule",
  muted: "--muted",
  red: "--red",
  onHead: "--on-head",
} as const;

type Colours = Record<keyof typeof COLOURS, string>;

const readColours = (): Colours => {
  const probe = document.createElement("span");
  probe.hidden = true;
  document.documentElement.append(probe);

  const colours = Record.map(COLOURS, (token) => {
    probe.style.color = `var(${token})`;

    return getComputedStyle(probe).color;
  });

  probe.remove();

  return colours;
};

const isDark = (rgb: string): boolean => {
  const [red = 255, green = 255, blue = 255] = Array.map(
    rgb.match(/[\d.]+/gu) ?? [],
    Number
  );

  return red * 0.299 + green * 0.587 + blue * 0.114 < 128;
};

const THEME_CSS = `
rect, line, path, polygon { shape-rendering: crispedges; }

/* nodes: paper in a 2px ink frame, square, on the 3px print shadow */
.node rect, .node polygon, .node circle, .node ellipse, .node path {
  fill: var(--paper); stroke: var(--ink); stroke-width: var(--line);
}
.node rect { rx: 0; ry: 0; }
.node { filter: drop-shadow(var(--shadow-button)); }
.label, .label text, .label span, .label p, .nodeLabel {
  font-family: var(--font-body); font-size: var(--type-body); color: var(--ink); fill: var(--ink);
}

/* edges: 2px ink, stepped (the curve is "step"), ink arrowheads */
.flowchart-link, .edgePaths .path { stroke: var(--ink); stroke-width: var(--line); }
.marker, .arrowheadPath { fill: var(--ink); stroke: var(--ink); }

/* edge labels sit on paper, in the sans a size down */
.edgeLabel, .edgeLabel p, .edgeLabel span, .labelBkg {
  background-color: var(--paper); color: var(--ink); font-size: var(--type-control);
}
.edgeLabel rect { fill: var(--paper); opacity: 1; }

/* clusters: a head-tinted area on a 1px rule, named in the label register */
.cluster rect { fill: var(--head); stroke: var(--rule); stroke-width: var(--hair); rx: 0; ry: 0; }
.cluster-label span, .cluster-label p, .cluster text, .cluster span {
  font-family: var(--font-px); font-size: var(--type-label); text-transform: uppercase;
  letter-spacing: var(--tracking-label); color: var(--on-head); fill: var(--on-head);
}

/* sequence: actors print like nodes; lifelines are rules; replies dot in 2px cells */
.actor { fill: var(--paper); stroke: var(--ink); stroke-width: var(--line); }
rect.actor { filter: drop-shadow(var(--shadow-button)); }
text.actor > tspan, .messageText { fill: var(--ink); }
.actor-line { stroke: var(--rule); stroke-width: var(--hair); }
.messageLine0, .messageLine1 { stroke: var(--ink); stroke-width: var(--line); }
.messageLine1 { stroke-dasharray: var(--line) var(--line) !important; }
[id$="-arrowhead"] path, [id$="-crosshead"] path { fill: var(--ink); stroke: var(--ink); }
.activation0, .activation1, .activation2 { fill: var(--head); stroke: var(--ink); stroke-width: var(--line); }

/* a loop or an alt: a 1px rule around it (a dashed line means a drop target here), and its
   word on an inverted tab, like a title bar. Mermaid writes the sans on every text, so the
   pixel face has to insist. */
.loopLine { stroke: var(--rule); stroke-width: var(--hair); stroke-dasharray: none; }
.labelBox { fill: var(--ink); stroke: var(--ink); }
.labelText, .labelText > tspan {
  fill: var(--paper); font-family: var(--font-px) !important; font-size: var(--type-label) !important;
  text-transform: uppercase; letter-spacing: var(--tracking-label);
}
.loopText, .loopText > tspan, .sectionTitle, .sectionTitle > tspan { fill: var(--muted); }

/* notes: the quiet notice, head tint in a rule frame */
.note { fill: var(--head); stroke: var(--rule); stroke-width: var(--line); }
.noteText, .noteText > tspan { fill: var(--on-head); }

.sequenceNumber { fill: var(--paper); font-family: var(--font-px) !important; }
[id$="-sequencenumber"] { fill: var(--ink); }
`;

const PIXELS = /^(?<amount>\d*\.?\d+)px$/u;

const theme = (): MermaidConfig => {
  const colours = readColours();
  const style = getComputedStyle(document.documentElement);
  const body = style.getPropertyValue("--font-body").trim();
  const type = style.getPropertyValue("--type-body").trim();
  const amount = PIXELS.exec(type)?.groups?.["amount"];

  if (amount === undefined) {
    throw new Error(`--type-body is not a length in pixels: "${type}".`);
  }

  const size = Number(amount);

  return {
    theme: "base",
    look: "classic",
    fontFamily: body,
    fontSize: size,
    themeCSS: THEME_CSS,
    themeVariables: {
      darkMode: isDark(colours.paper),
      background: colours.paper,
      fontFamily: body,
      fontSize: `${size}px`,
      strokeWidth: 2,
      primaryColor: colours.paper,
      primaryTextColor: colours.ink,
      primaryBorderColor: colours.ink,
      secondaryColor: colours.head,
      secondaryTextColor: colours.onHead,
      secondaryBorderColor: colours.ink,
      tertiaryColor: colours.head,
      tertiaryTextColor: colours.onHead,
      tertiaryBorderColor: colours.rule,
      mainBkg: colours.paper,
      nodeBorder: colours.ink,
      nodeTextColor: colours.ink,
      textColor: colours.ink,
      titleColor: colours.ink,
      lineColor: colours.ink,
      arrowheadColor: colours.ink,
      clusterBkg: colours.head,
      clusterBorder: colours.rule,
      edgeLabelBackground: colours.paper,
      actorBkg: colours.paper,
      actorBorder: colours.ink,
      actorTextColor: colours.ink,
      actorLineColor: colours.rule,
      signalColor: colours.ink,
      signalTextColor: colours.ink,
      labelBoxBkgColor: colours.ink,
      labelBoxBorderColor: colours.ink,
      labelTextColor: colours.paper,
      loopTextColor: colours.muted,
      activationBkgColor: colours.head,
      activationBorderColor: colours.ink,
      noteBkgColor: colours.head,
      noteTextColor: colours.onHead,
      noteBorderColor: colours.rule,
      sequenceNumberColor: colours.paper,
      errorBkgColor: colours.red,
      errorTextColor: colours.red,
    },
    flowchart: { curve: "step", padding: 12, nodeSpacing: 40, rankSpacing: 48 },
    sequence: { rightAngles: true },
  };
};

export class MermaidMissing extends Data.TaggedError("MermaidMissing")<{
  reason: string;
}> {}

class DiagramError extends Data.TaggedError("DiagramError")<{
  reason: string;
}> {}

const reasonOf = (cause: unknown): string =>
  cause instanceof Error ? cause.message : String(cause);

const DRAWING = Semaphore.makeUnsafe(1);

const loadFace = async (family: string): Promise<FontFace[]> => {
  const root = getComputedStyle(document.documentElement);

  return await document.fonts.load(
    `${root.getPropertyValue("--type-body").trim()} ${root.getPropertyValue(family).trim()}`
  );
};

export const loadMermaid: Effect.Effect<Mermaid, MermaidMissing> =
  Effect.tryPromise({
    try: async () => {
      const { default: mermaid } = await import("mermaid");

      return mermaid;
    },
    catch: (cause) => new MermaidMissing({ reason: reasonOf(cause) }),
  });

const loadFaces = Effect.tryPromise({
  try: async () =>
    await Promise.all([loadFace("--font-px"), loadFace("--font-body")]),
  catch: (cause) => new DiagramError({ reason: reasonOf(cause) }),
});

const renderDiagram = (
  load: Effect.Effect<Mermaid, MermaidMissing>,
  box: Element,
  source: string
): Effect.Effect<string, MermaidMissing | DiagramError> =>
  Effect.gen(function* () {
    const [mermaid] = yield* Effect.all([load, loadFaces], {
      concurrency: "unbounded",
    });

    return yield* Effect.tryPromise({
      try: async () => {
        mermaid.initialize({
          startOnLoad: false,
          suppressErrorRendering: true,
          ...theme(),
        });

        const { svg } = await mermaid.render(
          `pixel-paper-diagram-${crypto.randomUUID()}`,
          source,
          box
        );

        return svg;
      },
      catch: (cause) => new DiagramError({ reason: reasonOf(cause) }),
    });
  }).pipe(Semaphore.withPermit(DRAWING));

/** What a diagram's box reports. `SucceededDrawDiagram`: the diagram is drawn, in `palette`.
 *  `FailedLoadMermaid`: mermaid did not load (the application has not installed it, or its
 *  code did not arrive), so no diagram on the page can be drawn. `FailedDrawDiagram`: mermaid
 *  loaded but this diagram was not drawn, most often because its source does not parse.
 *  `reason` is the whole diagnostic, several lines for a parse error (the line, a caret under
 *  the fault, what was expected), so print it as written. */
export const Message = defineMessageUnion({
  SucceededDrawDiagram: { palette: Palette },
  FailedLoadMermaid: { palette: Palette, reason: Schema.String },
  FailedDrawDiagram: { palette: Palette, reason: Schema.String },
});

export type Message = typeof Message.Type;

export const drawDiagram =
  (load: Effect.Effect<Mermaid, MermaidMissing>) =>
  ({
    element,
    source,
    palette,
  }: Readonly<{
    element: Element;
    source: string;
    palette: Palette;
  }>): Effect.Effect<Message> =>
    renderDiagram(load, element, source).pipe(
      Effect.tap((svg) =>
        Effect.sync(() => {
          element.innerHTML = svg;
        })
      ),
      Effect.as(Message.SucceededDrawDiagram({ palette })),
      Effect.catchTags({
        MermaidMissing: ({ reason }) =>
          Effect.succeed(Message.FailedLoadMermaid({ palette, reason })),
        DiagramError: ({ reason }) =>
          Effect.succeed(Message.FailedDrawDiagram({ palette, reason })),
      })
    );
