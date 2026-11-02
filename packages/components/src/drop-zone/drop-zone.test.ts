import { FileDrop as UiFileDrop } from "@foldkit/ui";
import { Scene, Story } from "foldkit";
import type { HtmlBuilder } from "foldkit/html";
import { describe, it } from "vite-plus/test";

import * as DropZone from "./drop-zone.ts";

const sample = new File(["a,b\n1,2\n"], "sample.csv", { type: "text/csv" });

const dropZoneView =
  (viewInputs: Partial<DropZone.ViewInputs>) =>
  (model: DropZone.Model, h: HtmlBuilder<DropZone.Message>) =>
    DropZone.view(
      model,
      {
        title: "Drop files here",
        body: ["They upload to the sample folder."],
        ...viewInputs,
      },
      h
    );

const chooser = Scene.label("choose files");

describe("DropZone update", () => {
  it("reports the files a drop brings", () => {
    Story.story(
      DropZone.update,
      Story.given(DropZone.init({ id: "uploads" })),
      Story.message(
        DropZone.Message.GotFileDropMessage({
          message: UiFileDrop.Message.DroppedFiles({ files: [sample] }),
        })
      ),
      Story.expectOutMessage(
        DropZone.OutMessage.ReceivedFiles({ files: [sample] })
      )
    );
  });

  it("rejects a drop that holds no files", () => {
    Story.story(
      DropZone.update,
      Story.given(DropZone.init({ id: "uploads" })),
      Story.message(
        DropZone.Message.GotFileDropMessage({
          message: UiFileDrop.Message.DroppedNonFiles(),
        })
      ),
      Story.expectOutMessage(DropZone.OutMessage.RejectedNonFiles())
    );
  });
});

describe("DropZone view", () => {
  it("names its hidden file input by the button's word and takes several files", () => {
    Scene.scene(
      { update: DropZone.update, view: dropZoneView({}) },
      Scene.given(DropZone.init({ id: "uploads" })),
      Scene.expect(Scene.selector(".drop-zone strong")).toHaveText(
        "Drop files here"
      ),
      Scene.expect(chooser).toHaveAttr("type", "file"),
      Scene.expect(chooser).toHaveClass("sr-only"),
      Scene.expect(chooser).toHaveAttr("multiple"),
      Scene.expect(Scene.selector(".drop-zone")).not.toHaveAttr(
        "data-drag-over"
      )
    );
  });

  it("goes solid while a file hovers, and reports a chosen file", () => {
    Scene.scene(
      { update: DropZone.update, view: dropZoneView({}) },
      Scene.given(
        DropZone.update(
          DropZone.init({ id: "uploads" }),
          DropZone.Message.GotFileDropMessage({
            message: UiFileDrop.Message.EnteredDragZone(),
          })
        ).model
      ),
      Scene.expect(Scene.selector(".drop-zone")).toHaveAttr("data-drag-over"),
      Scene.changeFiles(chooser, [sample]),
      Scene.expectOutMessage(
        DropZone.OutMessage.ReceivedFiles({ files: [sample] })
      )
    );
  });
});
