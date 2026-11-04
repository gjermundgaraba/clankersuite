import { defineMarkdownEditorElement } from "@gjermundgaraba/components/markdown-editor/element";
import { Runtime } from "foldkit";

import "@gjermundgaraba/components/clankersuite.css";
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
