import { LineDiff } from "@gjermundgaraba/components";
import type { Html, HtmlBuilder } from "foldkit/html";

const PATCH = `diff --git a/current.toml b/current.toml
deleted file mode 100644
index 3f2a9c1..0000000
--- a/current.toml
+++ /dev/null
@@ -1,2 +0,0 @@
-# rollout
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

export const view = <Message>(h: HtmlBuilder<Message>): Html =>
  LineDiff.patchView({ patch: PATCH, label: "current.toml against main" }, h);
