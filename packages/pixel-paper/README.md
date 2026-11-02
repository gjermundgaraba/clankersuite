# @gjermundgaraba/pixel-paper

Printed paper panels for [Foldkit](https://foldkit.dev) applications: Departure Mono, 2px ink borders, solid offset shadows, 12×12 pixel glyphs, paper and plum palettes. For dense working interfaces: queues, boards, consoles, editors.

## Install

```bash
pnpm add @gjermundgaraba/pixel-paper foldkit @foldkit/ui effect @effect/platform-browser
```

Foldkit pins `effect` and `@effect/platform-browser` exactly as peers. An app on a later patch keeps one Effect instance by allowing it:

```yaml
# pnpm-workspace.yaml
peerDependencyRules:
  allowedVersions:
    effect: <the app's version>
    "@effect/platform-browser": <the app's version>
```

## Set up

The views ship branded for Foldkit's view identity, so the app's build needs only `foldkit()`. Import the stylesheet once, from the client entry:

```ts
import "@gjermundgaraba/pixel-paper/pixel-paper.css";
```

The stylesheet follows the reader's colour scheme. `Scheme.SchemeSwitch` lets them pin one, and `schemeScript` applies it before first paint; write it into the head:

```ts
import { schemeScript } from "@gjermundgaraba/pixel-paper/scheme";

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

Provide `Clipboard.layer` as the application's resources where a component copies.

`MarkdownEditor.view` edits Markdown in place, and `MarkdownEditor.readView` shows a stored document in the same look with nothing to edit. Both need the element registered once, from the client entry, before the first render:

```ts
import { defineMarkdownEditorElement } from "@gjermundgaraba/pixel-paper/markdown-editor/element";

defineMarkdownEditorElement();
```

Only that subpath loads CodeMirror, so an application that never imports it pays nothing and shows a plain textarea, or for a read view the source as prose. Links open with Ctrl or Cmd and a click, or Ctrl or Cmd and Enter at the caret; in a read view they are links, opened with a click or from the keyboard. A disabled fieldset makes the editor read-only.

## Licence

MIT. Departure Mono, in `fonts/`, carries its own licence beside it. `THIRD_PARTY_NOTICES.md` carries the licence of the Markdown editor's live layer.
