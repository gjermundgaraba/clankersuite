---
order: 1
---

# Setup

What an application does once, so that every component works as its page shows.

## Stylesheets

Import the brand's font, then its tokens, then the components' stylesheet, once, from the client entry. The components take every value from the tokens, so the tokens load first.

```ts
import "@gjermundgaraba/fonts/departure-mono.css";
import "@gjermundgaraba/design-tokens/clankersuite.css";
import "@gjermundgaraba/components/components.css";
```

## The scheme script

The stylesheet follows the reader's colour scheme, and `Scheme.SchemeSwitch` lets them pin one on this device. Put `schemeScript` in the head, before the stylesheets paint, so a pinned scheme never flashes the other one first:

```ts
// vite.config.ts
import { foldkit } from "@foldkit/vite-plugin";
import { schemeScript } from "@gjermundgaraba/components/scheme";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    foldkit(),
    {
      name: "scheme-script",
      transformIndexHtml: () => [
        { tag: "script", children: schemeScript, injectTo: "head-prepend" },
      ],
    },
  ],
});
```

A page rendered on the server writes it into the head it renders: `<script>${schemeScript}</script>`.

## Resources

`CopyButton` writes through `Clipboard.Clipboard`. Give the application `Clipboard.layer` as its resources:

```ts
import { Clipboard } from "@effect/platform-browser";
import { Runtime } from "foldkit";

const application = Runtime.makeApplication({
  Model,
  init,
  update,
  view,
  resources: Clipboard.layer,
  container: document.querySelector("#root"),
  routing: {
    onUrlRequest: (request) => Message.ClickedLink({ request }),
    onUrlChange: (url) => Message.ChangedUrl({ url }),
  },
});

Runtime.run(application);
```

## The live parts

What `Announcer.Announce` says is heard through the page's one live region, and the toast stack sits beside it. An open dialog makes the page outside it inert and hidden from screen readers, so both render inside the topmost open dialog, and at the end of the body while none is open. Place them with `LiveRegion.place` on every render, from the Model, listing the dialogs that can host them from the bottom of the stack to the top:

```ts
const livePartsOf = (model: Model, h: HtmlBuilder<Message>) =>
  LiveRegion.place(
    [
      ["Rename", Dialog.isOpen(model.rename)],
      ["Delete", ConfirmDialog.isOpen(model.deleteConfirm)],
    ],
    () => LiveRegion.view({ toasts: toastsView(model, h) }, h)
  );

const view = (model: Model, h: HtmlBuilder<Message>): Document => {
  const liveParts = livePartsOf(model, h);

  return {
    title: "Files",
    body: h.div(
      [],
      [
        SkipLink.view(h),
        Deck.view({ body: [filesView(model, h)] }, h),
        renameDialogView(model, liveParts.toDialogView("Rename"), h),
        deleteConfirmView(model, liveParts.toDialogView("Delete"), h),
        ...liveParts.toPageView(),
      ]
    ),
  };
};
```

Each dialog passes what it is given on as its `toLiveRegionView`. The application's Message union carries `CompletedAnnounce: {}` and `CompletedFlash: {}`, which `Announcer.Announce` and `Announcer.Flash` report; its update changes nothing for them. [Live region](/components/live-region) shows the rule at work.

## Links to a fragment

A Foldkit application routes every followed link through its update, so the browser no longer moves focus to the element a fragment names. Return `SkipLink.ScrollToFragment` from the URL handler: with a fragment it scrolls to that element and focuses it; without one it scrolls to the top, so a new page opens at its top.

```ts
ChangedUrl: ({ url }) => ({
  model: modifyFields(model, { route: () => urlToAppRoute(url) }),
  commands: [SkipLink.ScrollToFragment({ maybeFragment: url.hash })],
}),
CompletedScrollToFragment: () => ({ model }),
```

Render `SkipLink.view(h)` first in the body. It links to `#main`, the landmark that Deck, Stage and Wall render.

## The key platform

Components that print a key take the platform as `platform`, which lives in the application's Model. Detect it once, from `init`:

```ts
const DetectKeyPlatform = Command.define("DetectKeyPlatform", {
  messages: [Message.CompletedDetectKeyPlatform],
  execute: KeyHint.detectKeyPlatform.pipe(
    Effect.map((platform) => Message.CompletedDetectKeyPlatform({ platform }))
  ),
});
```

## The Markdown editor

An application that uses `MarkdownEditor` registers its element once, from the client entry, before the first render. Only this entry loads CodeMirror.

```ts
import { defineMarkdownEditorElement } from "@gjermundgaraba/components/markdown-editor/element";

defineMarkdownEditorElement();
```
