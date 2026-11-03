import type { Extension } from "@codemirror/state";

import { accessExtension, createEngine, readExtension } from "./engine.ts";
import type { Engine, EngineConfig } from "./engine.ts";
import { spec } from "./markdown-editor.ts";
import { afterEmission, afterSource } from "./reconcile.ts";
import type { Pending } from "./reconcile.ts";

const MIRRORED_ATTRIBUTES = ["aria-describedby", "aria-invalid"] as const;

const MOTION_END_EVENTS = ["animationend", "transitionend"] as const;

const mirroredAttributes = (
  textarea: HTMLTextAreaElement
): Readonly<Record<string, string>> =>
  Object.fromEntries(
    MIRRORED_ATTRIBUTES.flatMap((name) => {
      const value = textarea.getAttribute(name);

      return value === null ? [] : [[name, value]];
    })
  );

const namedBy = (textarea: HTMLTextAreaElement) => {
  const [label] = textarea.labels ?? [];

  if (label === undefined) {
    return {};
  }

  if (label.id === "") {
    label.id = `${textarea.id}-label`;
  }

  return { "aria-labelledby": label.id };
};

const createEngineOrReport = (config: EngineConfig): Engine | undefined => {
  try {
    return createEngine(config);
  } catch (error) {
    reportError(error);

    return undefined;
  }
};

type Mounted = Readonly<{
  engine: Engine;
  syncAccess?: () => void;
  unmount: () => void;
}>;

class MarkdownEditorElement extends HTMLElement {
  static formAssociated = true;

  #source = "";

  #isDisabled = false;

  #pending: Pending = [];

  #mounted: Mounted | undefined;

  get source(): string {
    return this.#source;
  }

  set source(next: string) {
    this.#source = next;
    const engine = this.#mounted?.engine;

    if (engine === undefined) {
      return;
    }

    const { pending, isExternal } = afterSource(
      this.#pending,
      next,
      engine.doc()
    );

    this.#pending = pending;

    if (isExternal) {
      engine.applyExternal(next);
    }
  }

  formDisabledCallback(isDisabled: boolean): void {
    this.#isDisabled = isDisabled;
    this.#mounted?.syncAccess?.();
  }

  connectedCallback(): void {
    if (this.#mounted !== undefined) {
      return;
    }

    const textarea = this.querySelector("textarea");
    const shownText = this.querySelector(":scope > .gg-prose");

    if (textarea !== null) {
      this.#mounted = this.#mountEditor(textarea);
    } else if (shownText !== null) {
      this.#mounted = this.#mount(shownText, "gg-markdown-read", readExtension);
    }
  }

  disconnectedCallback(): void {
    queueMicrotask(() => {
      if (!this.isConnected) {
        this.#mounted?.unmount();
      }
    });
  }

  #mountEditor(textarea: HTMLTextAreaElement): Mounted | undefined {
    const accessAttributes = () => ({
      ...namedBy(textarea),
      ...mirroredAttributes(textarea),
    });

    const mounted = this.#mount(
      textarea,
      "gg-markdown-surface",
      accessExtension(accessAttributes(), this.#isDisabled)
    );

    if (mounted === undefined) {
      return undefined;
    }

    const { engine, surface, signal } = mounted;

    const syncAccess = () => {
      engine.configureAccess(accessAttributes(), this.#isDisabled);
    };

    const attributeObserver = new MutationObserver(syncAccess);

    surface.style.setProperty("--gg-rows", `${textarea.rows}`);
    textarea.tabIndex = -1;
    textarea.setAttribute("aria-hidden", "true");
    textarea.addEventListener("focus", engine.focus, { signal });

    textarea.labels?.[0]?.addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        engine.focus();
      },
      { signal }
    );

    attributeObserver.observe(textarea, {
      attributes: true,
      attributeFilter: [...MIRRORED_ATTRIBUTES],
    });

    signal.addEventListener("abort", () => {
      attributeObserver.disconnect();
    });

    return { ...mounted, syncAccess };
  }

  #mount(replaced: Element, surfaceClass: string, access: Extension) {
    const surface = document.createElement("div");

    surface.className = surfaceClass;
    replaced.after(surface);

    const engine = createEngineOrReport({
      parent: surface,
      doc: this.#source,
      access,
      onLocalChange: (doc) => {
        this.#pending = afterEmission(this.#pending, doc);
        this.dispatchEvent(
          new CustomEvent("value-change", { detail: { value: doc } })
        );
      },
    });

    if (engine === undefined) {
      surface.remove();

      return undefined;
    }

    const lifetime = new AbortController();
    const motion = new AbortController();

    const remeasureAfterMotion = (event: Event) => {
      if (event.target instanceof Node && event.target.contains(this)) {
        engine.requestMeasure();
        motion.abort();
      }
    };

    for (const name of MOTION_END_EVENTS) {
      document.addEventListener(name, remeasureAfterMotion, {
        capture: true,
        signal: motion.signal,
      });
    }

    return {
      engine,
      surface,
      signal: lifetime.signal,
      unmount: () => {
        lifetime.abort();
        motion.abort();
        engine.destroy();
        surface.remove();
        this.#mounted = undefined;
        this.#pending = [];
      },
    };
  }
}

/** Registers `<gg-markdown-editor>`. Call it once from the client entry, before the first
 *  render. This subpath carries CodeMirror, so the package's root never registers it for an
 *  application that does not ask. */
export const defineMarkdownEditorElement = (): void => {
  if (customElements.get(spec.tag) === undefined) {
    customElements.define(spec.tag, MarkdownEditorElement);
  }
};
