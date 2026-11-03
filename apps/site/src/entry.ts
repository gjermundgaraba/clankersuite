import { defineMarkdownEditorElement } from "@gjermundgaraba/components/markdown-editor/element";
import { Runtime } from "foldkit";

import "@gjermundgaraba/fonts/departure-mono.css";
import "@gjermundgaraba/design-tokens/clankersuite.css";
import "@gjermundgaraba/components/components.css";
import "../site.css";
import { init, update, view } from "./main.ts";
import { Message } from "./message.ts";
import { Model } from "./model.ts";

defineMarkdownEditorElement();

const application = Runtime.makeApplication({
  Model,
  init,
  update,
  view,
  container: document.querySelector("#root"),
  routing: {
    onUrlRequest: (request) => Message.ClickedLink({ request }),
    onUrlChange: (url) => Message.ChangedUrl({ url }),
  },
});

Runtime.run(application);
