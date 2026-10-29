import {
  CodeEditor,
  CodeSurface,
  LineDiff,
  TextButton,
} from "@gjermundgaraba/pixel-paper";
import { Schema } from "effect";
import type { Html } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";
import { defineView } from "foldkit/submodel";
import type * as Update from "foldkit/update";

import { rowView, specView } from "../spec.ts";

// SAMPLE

const SAMPLE_CONFIG = `# rollout (sample)
window = "Tue 09:00"
drain = true
batch = 4
notify = "ops"
rollback = "auto"
`;

const SAMPLE_RENAMED = `diff --git a/rollout.toml b/deploy/rollout.toml
similarity index 83%
rename from rollout.toml
rename to deploy/rollout.toml
index 3f2a9c1..8b07d44 100644
--- a/rollout.toml
+++ b/deploy/rollout.toml
@@ -2,3 +2,3 @@ window = "Tue 09:00"
 drain = true
-batch = 4
+batch = 8
 notify = "ops"
`;

const SAMPLE_LINKED = `diff --git a/current.toml b/current.toml
deleted file mode 100644
index 3f2a9c1..0000000
--- a/current.toml
+++ /dev/null
@@ -1,2 +0,0 @@
-# rollout (sample)
-batch = 4
diff --git a/current.toml b/current.toml
new file mode 120000
index 0000000..9d1e4a7
--- /dev/null
+++ b/current.toml
@@ -0,0 +1 @@
+deploy/rollout.toml
\\ No newline at end of file
`;

export const Model = Schema.Struct({ editorValue: Schema.String });

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  UpdatedEditorValue: { value: Schema.String },
  ClickedRestore: {},
});

export type Message = typeof Message.Type;

export const init = (): Model => ({
  editorValue: SAMPLE_CONFIG.replace("batch = 4", "batch = 8"),
});

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    UpdatedEditorValue: ({ value }) => ({
      model: modifyFields(model, { editorValue: () => value }),
    }),
    ClickedRestore: () => ({
      model: modifyFields(model, { editorValue: () => SAMPLE_CONFIG }),
    }),
  });

export const view = defineView<Model, Message>((model, h): Html =>
  rowView(
    [
      specView(
        "code to read",
        [
          CodeSurface.view(
            {
              label: "rollout.toml, the original (sample)",
              body: [SAMPLE_CONFIG],
            },
            h
          ),
        ],
        h
      ),
      specView(
        "code to edit",
        [
          CodeEditor.view(
            {
              id: "code-editor",
              value: model.editorValue,
              onInput: (value) => Message.UpdatedEditorValue({ value }),
              label: "rollout.toml (sample)",
            },
            h
          ),
        ],
        h
      ),
      specView(
        "the edit against the original",
        [
          LineDiff.view(
            {
              before: SAMPLE_CONFIG,
              after: model.editorValue,
              label: "The original against the edit",
              context: 1,
            },
            h
          ),
          TextButton.view(
            {
              label: "restore the original",
              onClick: Message.ClickedRestore(),
            },
            h
          ),
        ],
        h
      ),
      specView(
        "a patch from git: what its header says, above its lines",
        [
          LineDiff.patchView(
            {
              patch: SAMPLE_RENAMED,
              label: "deploy/rollout.toml against main (sample)",
            },
            h
          ),
        ],
        h
      ),
      specView(
        "a file that became a symlink: each side under one note",
        [
          LineDiff.patchView(
            {
              patch: SAMPLE_LINKED,
              label: "current.toml against main (sample)",
            },
            h
          ),
        ],
        h
      ),
    ],
    h
  )
);
