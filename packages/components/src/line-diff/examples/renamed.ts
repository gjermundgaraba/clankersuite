import { LineDiff } from "@gjermundgaraba/components";
import type { Html, HtmlBuilder } from "foldkit/html";

const PATCH = `diff --git a/rollout.toml b/deploy/rollout.toml
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

export const view = <Message>(h: HtmlBuilder<Message>): Html =>
  LineDiff.patchView(
    { patch: PATCH, label: "deploy/rollout.toml against main" },
    h
  );
