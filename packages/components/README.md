# @gjermundgaraba/components

The [Foldkit](https://foldkit.dev) components of the gjermundgaraba design system, for dense working interfaces: queues, boards, consoles, editors. Their stylesheet takes every value from a brand's tokens, so the brand decides the look.

## Install

```bash
pnpm add @gjermundgaraba/components @gjermundgaraba/icons foldkit @foldkit/ui effect @effect/platform-browser
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

The views ship branded for Foldkit's view identity, so the app's build needs only `foldkit()`. Import the brand's stylesheet once, from the client entry. It brings the brand's font and tokens, then the components' stylesheet:

```ts
import "@gjermundgaraba/components/clankersuite.css";
```

Every class the stylesheet styles starts with `gg-`, and every attribute it reads with `data-gg-`. Glyphs come from `@gjermundgaraba/icons`: `import { Glyph } from "@gjermundgaraba/icons"`.

The stylesheet follows the reader's colour scheme. `Scheme.SchemeSwitch` lets them pin one, and `schemeScript` applies it before first paint; write it into the head:

```ts
import { schemeScript } from "@gjermundgaraba/components/scheme";

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
import { defineMarkdownEditorElement } from "@gjermundgaraba/components/markdown-editor/element";

defineMarkdownEditorElement();
```

Only that subpath loads CodeMirror, so an application that never imports it pays nothing and shows a plain textarea, or for a read view the source as prose. Links open with Ctrl or Cmd and a click, or Ctrl or Cmd and Enter at the caret; in a read view they are links, opened with a click or from the keyboard. A disabled fieldset makes the editor read-only.

## In an application

An application on the components keeps these rules. Its `AGENTS.md` points here, so they change with the version it installs.

- It imports the brand's stylesheet whole, once, as above, and depends on `@gjermundgaraba/components` and `@gjermundgaraba/icons`, not on the tokens or the font.
- It writes no `gg-` class and no `data-gg-` attribute: a component's config prints them. A component's `attributes` never carry a class, since Foldkit keeps the last `Class` and the component's own comes last. Where the application needs a hook of its own, it wraps the component in an element of its own.
- It may read the `gg-` classes and `data-gg-` attributes the components print: in a test, or in a stylesheet that places a component (margin, gap, width, a container query). It does not change a component's look (colour, type, border, shadow); a look it needs goes into the component.
- A test finds an element by its role, label or text where it has one, and reads a state that has a meaning through ARIA (`aria-current`, `aria-expanded`, `aria-pressed`, `inert`).
- Its own stylesheet takes values from the brand's `--semantic-*` tokens, never `--primitive-*`. Of the components' custom properties it uses only `--gg-dither`, the brand's ground.

## Licence

MIT. `THIRD_PARTY_NOTICES.md` carries the licence of the Markdown editor's live layer.
