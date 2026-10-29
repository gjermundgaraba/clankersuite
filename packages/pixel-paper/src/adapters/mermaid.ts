import { Schema } from "effect";
import type { Html, HtmlBuilder } from "foldkit/html";
import * as Mount from "foldkit/mount";

import { Palette } from "../scheme/scheme.ts";
import { Message, drawDiagram, loadMermaid } from "./diagram.ts";

export { Message } from "./diagram.ts";

/** Draws `source` into the box it is mounted on and reports how it went. Its args are read
 *  once, so the box is keyed by the palette and the source: either changing mounts a new box
 *  and draws again. A View lifts it with `Mount.mapMessage`, which a Scene does not replay:
 *  resolve it by name, `{ name: DrawDiagram.name }`, with the caller's own Message. */
export const DrawDiagram = Mount.define("DrawDiagram", {
  args: { source: Schema.String, palette: Palette },
  messages: [
    Message.SucceededDrawDiagram,
    Message.FailedLoadMermaid,
    Message.FailedDrawDiagram,
  ],
  execute: drawDiagram(loadMermaid),
});

/** Configuration for rendering a diagram with `view`. */
export type ViewConfig<ParentMessage> = Readonly<{
  /** The mermaid source. Give it `accTitle` and `accDescr`, which name the drawing to screen
   *  readers. */
  source: string;
  /** The palette the page prints in, from `Scheme.SchemeSwitch.palette`: a new one draws
   *  again, including a change of the system's palette under `System`. */
  palette: Palette;
  /** Takes the box's report: `SucceededDrawDiagram`, `FailedLoadMermaid` or
   *  `FailedDrawDiagram`. */
  toParentMessage: (message: Message) => ParentMessage;
}>;

/** The box a diagram is drawn in, once it is on the page. Empty on the server and until the
 *  drawing lands; the caller shows a Loading line or an error Notice beside it. */
export const view = <ParentMessage>(
  config: ViewConfig<ParentMessage>,
  h: HtmlBuilder<ParentMessage>
): Html => {
  const { source, palette, toParentMessage } = config;

  return h.keyed("div")(`${palette}:${source}`, [
    h.Class("diagram"),
    h.OnMount(
      Mount.mapMessage(DrawDiagram({ source, palette }), toParentMessage)
    ),
  ]);
};
