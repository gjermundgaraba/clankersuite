import { defineMarkdownEditorElement } from "@gjermundgaraba/components/markdown-editor/element";
import { SCHEME_ATTRIBUTE } from "@gjermundgaraba/components/scheme";
import { Runtime } from "foldkit";

import "@gjermundgaraba/components/clankersuite.css";
import "../site.css";
import { init, update, view } from "./main.ts";
import { Message } from "./message.ts";
import { Model } from "./model.ts";

defineMarkdownEditorElement();

const followScheme = (parent: HTMLElement): void => {
  const copy = (): void => {
    const scheme = parent.getAttribute(SCHEME_ATTRIBUTE);

    if (scheme === null) {
      document.documentElement.removeAttribute(SCHEME_ATTRIBUTE);
    } else {
      document.documentElement.setAttribute(SCHEME_ATTRIBUTE, scheme);
    }
  };

  copy();
  new MutationObserver(copy).observe(parent, {
    attributes: true,
    attributeFilter: [SCHEME_ATTRIBUTE],
  });
};

if (window.parent !== window) {
  followScheme(window.parent.document.documentElement);
}

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
