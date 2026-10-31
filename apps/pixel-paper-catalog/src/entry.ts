import { Clipboard } from "@effect/platform-browser";
import { defineMarkdownEditorElement } from "@gjermundgaraba/pixel-paper/markdown-editor/element";
import { Runtime } from "foldkit";

import "@gjermundgaraba/pixel-paper/pixel-paper.css";
import "../catalog.css";
import { init, subscriptions, update, view } from "./main.ts";
import { Message } from "./message.ts";
import { Model } from "./model.ts";

defineMarkdownEditorElement();

const application = Runtime.makeApplication({
  Model,
  init,
  update,
  view,
  subscriptions,
  resources: Clipboard.layer,
  container: document.querySelector("#root"),
  routing: {
    onUrlRequest: (request) => Message.ClickedLink({ request }),
    onUrlChange: (url) => Message.ChangedUrl({ url }),
  },
});

Runtime.hydrate(application);
