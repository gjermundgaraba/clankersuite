import * as Mermaid from "@gjermundgaraba/pixel-paper/adapters/mermaid";
import { Story } from "foldkit";
import { describe, expect, it } from "vite-plus/test";

import * as DiagramsExample from "./diagrams.ts";

const drawn = (id: string, message: Mermaid.Message) =>
  DiagramsExample.Message.GotDiagramMessage({ id, message });

describe("Diagrams example", () => {
  it("keeps how each diagram's last draw went", () => {
    Story.story(
      DiagramsExample.update,
      Story.given(DiagramsExample.init()),
      Story.message(
        drawn(
          "flow",
          Mermaid.Message.SucceededDrawDiagram({ palette: "Paper" })
        )
      ),
      Story.message(
        drawn(
          "broken",
          Mermaid.Message.FailedDrawDiagram({
            palette: "Plum",
            reason: "Parse error",
          })
        )
      ),
      Story.model((model) => {
        expect(model.drawings["flow"]?._tag).toBe("SucceededDrawDiagram");
        expect(model.drawings["broken"]?._tag).toBe("FailedDrawDiagram");
      }),
      Story.message(
        drawn(
          "broken",
          Mermaid.Message.SucceededDrawDiagram({ palette: "Plum" })
        )
      ),
      Story.model((model) => {
        expect(model.drawings["broken"]?._tag).toBe("SucceededDrawDiagram");
      })
    );
  });

  it("keeps that the diagram renderer could not load", () => {
    Story.story(
      DiagramsExample.update,
      Story.given(DiagramsExample.init()),
      Story.message(
        drawn(
          "flow",
          Mermaid.Message.FailedLoadMermaid({
            palette: "Paper",
            reason: "Offline",
          })
        )
      ),
      Story.model((model) => {
        expect(model.drawings["flow"]?._tag).toBe("FailedLoadMermaid");
      })
    );
  });
});
