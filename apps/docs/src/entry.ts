import { Clipboard } from "@effect/platform-browser";
import { defineMarkdownEditorElement } from "@gjermundgaraba/components/markdown-editor/element";
import { Runtime } from "foldkit";

import "@gjermundgaraba/fonts/departure-mono.css";
import "@gjermundgaraba/design-tokens/clankersuite.css";
import "@gjermundgaraba/components/components.css";
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
