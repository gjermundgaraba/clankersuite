<!--VITE PLUS START-->

# Using Vite+, the Unified Toolchain for the Web

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, and it invokes Vite through `vp dev` and `vp build`. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

Docs are local at `node_modules/vite-plus/docs` or online at https://viteplus.dev/guide/.

## Built-in Commands vs Scripts

`vp <name>` runs a built-in command. `vp run <name>` runs a `package.json` script or a `vite.config.ts` task. Scripts cannot overwrite built-ins, so `vp dev` and `vp run dev` may do different things. Check `package.json` and `vite.config.ts` first, and run `vp run <name>` when the project defines a script or task with that name.

## Running Scripts

Run TypeScript and JavaScript files with `vpx <file>`, for example `vpx ./scripts/seed.ts --dry-run`. It handles enums, decorators, JSX, and tsconfig `paths`, so do not add `tsx` or `ts-node` to run scripts. `vpx --watch <file>` reruns the file when a file it uses changes, in place of `tsx watch`. `vp node <file>` runs plain Node.js.

## Tool Versions

Run `vp toolchain` to show versions and relationships in the active Vite+
release. Add a tool name to select part of the graph. For example, run
`vp toolchain vite`. Use `--global` to ignore the local `vite-plus` package. Use
`vp why <package>` to show the package-manager dependency graph.

## Review Checklist

- [ ] Run `vp install` after pulling remote changes and before getting started.
- [ ] Run `vp check` and `vp test` to format, lint, type check and test changes.
- [ ] Check if there are `vite.config.ts` tasks or `package.json` scripts necessary for validation, run via `vp run <script>`.
- [ ] If setup, runtime, or package-manager behavior looks wrong, run `vp env doctor` and include its output when asking for help.

<!--VITE PLUS END-->

# This repository

The gjermundgaraba design system, for seven applications: clankerauth, clankerbot, clankerpedia, clankerspace, clankerusage, durable-clanker and wtf. Four packages are published to npm, `@gjermundgaraba/design-tokens`, `fonts`, `icons` and `components`, released together at one version; a package depends on another at exactly that version (`workspace:*`). `apps/docs` is the documentation site and is not published. A component's page is `<dir>/<dir>.md` in its directory, and each `::Example{name}` on it is `<dir>/examples/<name>.ts`, run as its own Foldkit program; a package's other pages are in `packages/<package>/docs/`, and their examples in `apps/docs/src/foundations/<package>/examples/`, since an example lays out with components and only `apps/docs` can depend on all four packages. Every export has a page, and the page shows each of its states. A brand is a token set, a font and, one day, its own drawing of the glyph names; clankersuite is the only brand, and an application imports it whole as `@gjermundgaraba/components/clankersuite.css`.

`repos/foldkit` is Foldkit's source at the catalog's `foldkit` version, the reference for Foldkit's APIs and conventions. Where this repo's lint config and Foldkit's conventions differ, the lint wins (arrays are `readonly T[]`). Never edit `repos/foldkit`; after a Foldkit upgrade, re-pin it:

```bash
git subtree pull --prefix=repos/foldkit https://github.com/foldkit/foldkit.git foldkit@<version> --squash
```

Compare primitives with `===`. A function does one job; there is no line limit. The docs app is tested by its smoke test, `vp run docs#smoke`, which loads every page in a browser, runs every example on it, and checks the navigation marks the page it is on and a followed link puts focus on `main`.

# components

The seven applications are its only users. A component, export or config field that none of them uses, and that nothing else in the package needs, is deleted; the catalog showing it is no reason to keep it.

A release bumps `version` in every `packages/*/package.json` to one new version on `main`; CI publishes any version npm doesn't have. A package marked `private` never publishes.

- Disabled is `@foldkit/ui`'s `isDisabled`: `aria-disabled`, still focusable, no handler. A held control that would submit a form renders `type="button"`.
- Key handling that depends on the event's target, `isComposing` or `defaultPrevented` goes in a Mount that prevents the default only when it acts, never in a view handler.
- A view takes `attributes?` (or `<part>Attributes?`) and spreads them before its own; there is no `className`, and passed attributes never carry a class.
- A Submodel that can appear twice on a page scopes its DOM ids by its instance id and takes a key prefix for its Subscriptions, because `Subscription.aggregate` throws on a repeated key.
- A parent reads a child Submodel only through the accessors it exports.
- What must be heard or reached while a dialog is open renders inside the topmost open dialog, through `toLiveRegionView`.
- The key platform lives in the application's Model; components take it as `platform`.
- Work that holds a dialog open ends in a timeout mapped to its failure Message.
- Numbers and dates are formatted with an explicit English locale, so the server and every browser write the same text.
- The browser baseline is current stable Chrome, Firefox and Safari: use the platform (`<dialog>`, `popover`, anchor positioning, `light-dark()`) with no fallbacks.
- The stylesheet takes every value a token covers from a `--semantic-*` token of `@gjermundgaraba/design-tokens`, never a `--primitive-*` one, so a brand changes the look without changing a component. clankersuite's look: square corners, solid offset shadows with no blur, stepped or instant motion, icons drawn as Glyph cells.
- Every class the stylesheet styles is `gg-<name>`, every attribute the components write `data-gg-<name>`, every element `gg-<name>`, and every custom property, anchor name and keyframes the stylesheet owns `--gg-<name>` or `gg-<name>`; the brand's tokens are `--semantic-*` and `--primitive-*`. Third-party names stay: CodeMirror's `cm-`, the highlighter's `tok-`, `@foldkit/ui`'s `sr-only` and its `data-sortable-id`, `data-draggable-id`, `data-droppable-id` and `data-drag-over`, Foldkit's `data-foldkit-*`. The pinned scheme is `data-color-scheme` on `<html>`. `stylesheet.test.ts` and `names.test.ts` hold the line.
- An application writes no `gg-` class itself: where it needs one, a component's config or view prints it. Its tests reach a component's state through ARIA where the state has a meaning (`aria-current`, `aria-expanded`, `aria-pressed`, `inert`), and otherwise through the class a config field it set promises.
- An example is application code a reader copies: it imports only public APIs, lays out with the system's components, writes no CSS, and gives a component what an application would (the key platform, the live parts, `Clipboard.layer`). An example with logic of its own (a Command, a Mount, an OutMessage fold) is tested in `examples/<name>.test.ts`; `classes.test.ts` and the docs app's smoke test run every example.
- A component that builds a pattern `@foldkit/ui` covers (a menu, a combobox, tabs) says in its doc comment what `@foldkit/ui` lacks, so a Foldkit upgrade can retire it.
- Where the code builds a `@foldkit/ui` child Message itself, under a one-line lint disable, or reads a `@foldkit/ui` Model, it works around a capability Foldkit lacks. On a Foldkit upgrade, drop the workarounds it makes unnecessary.

Tests import `Scene` and `Story` as namespaces from `foldkit`. A Scene finds an element by its role, label or text, and by a CSS selector only when the test checks a class or attribute the component promises. In happy-dom tests, make `localStorage` fail by stubbing the whole store with `vi.stubGlobal`, never a spy on `Storage.prototype`, which misses a store an earlier test already used. happy-dom does no layout, so a test that needs sizes sets them itself.

# design-tokens

`packages/design-tokens/tokens` holds the DTCG sources; `generated/<brand>.css` is built from them and committed. After editing a source, run `vp run @gjermundgaraba/design-tokens#build`. Naming and the shape of a brand are in its README.

# Effect

Before writing or reviewing Effect code, read `node_modules/effect/AGENTS.md` in the package you are changing and the examples it links under `ai-docs/`. They ship with the installed `effect`, so they match the APIs the code compiles against. For exact signatures, read that package's installed source and types in `node_modules/effect` and `node_modules/@effect/*`. Do not write Effect APIs from memory or from examples for another version.
