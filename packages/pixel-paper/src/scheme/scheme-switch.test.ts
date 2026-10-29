import { Effect, Stream } from "effect";
import { Scene, Story } from "foldkit";
import { describe, expect, it, vi } from "vite-plus/test";

import * as SchemeSwitch from "./scheme-switch.ts";
import { SCHEME_ATTRIBUTE, SCHEME_STORAGE_KEY } from "./script.ts";

const schemeSwitchInit = SchemeSwitch.init();

describe("SchemeSwitch init", () => {
  it("starts on System and takes up the scheme schemeScript pinned before the page ran", () => {
    expect(SchemeSwitch.scheme(schemeSwitchInit.model)).toBe("System");
    expect(schemeSwitchInit.model.systemPalette).toBe("Paper");
    expect(schemeSwitchInit.commands?.map(({ name }) => name)).toStrictEqual([
      "ReadScheme",
    ]);
    Story.story(
      SchemeSwitch.update,
      Story.given(schemeSwitchInit.model),
      Story.message(
        SchemeSwitch.Message.CompletedReadScheme({ scheme: "Plum" })
      ),
      Story.model((model) => {
        expect(SchemeSwitch.scheme(model)).toBe("Plum");
      })
    );
  });
});

describe("SchemeSwitch update", () => {
  it("pins a selected scheme", () => {
    Story.story(
      SchemeSwitch.update,
      Story.given(schemeSwitchInit.model),
      Story.message(SchemeSwitch.Message.SelectedScheme({ scheme: "Plum" })),
      Story.model((model) => {
        expect(model.scheme).toBe("Plum");
      }),
      Story.Command.resolve(
        SchemeSwitch.PinScheme,
        SchemeSwitch.Message.CompletedPinScheme()
      )
    );
  });

  it("follows the scheme it reads without pinning it again", () => {
    Story.story(
      SchemeSwitch.update,
      Story.given(schemeSwitchInit.model),
      Story.message(
        SchemeSwitch.Message.CompletedReadScheme({ scheme: "Paper" })
      ),
      Story.Command.expectNone(),
      Story.model((model) => {
        expect(model.scheme).toBe("Paper");
      })
    );
  });
});

describe("SchemeSwitch system palette", () => {
  it("follows the palette the reader's system prefers, whatever is pinned", () => {
    Story.story(
      SchemeSwitch.update,
      Story.given(schemeSwitchInit.model),
      Story.message(
        SchemeSwitch.Message.UpdatedSystemPalette({ palette: "Plum" })
      ),
      Story.Command.expectNone(),
      Story.model((model) => {
        expect(SchemeSwitch.scheme(model)).toBe("System");
        expect(model.systemPalette).toBe("Plum");
      }),
      Story.message(
        SchemeSwitch.Message.CompletedReadScheme({ scheme: "Paper" })
      ),
      Story.model((model) => {
        expect(SchemeSwitch.scheme(model)).toBe("Paper");
        expect(model.systemPalette).toBe("Plum");
      })
    );
  });
});

const readScheme = () =>
  SchemeSwitch.init().commands?.map(({ effect }) => Effect.runSync(effect));

const refuse = () => {
  throw new Error("storage refused");
};

describe("SchemeSwitch commands", () => {
  it("pins a scheme on <html> and remembers it, and System removes both", () => {
    Effect.runSync(SchemeSwitch.PinScheme({ scheme: "Plum" }).effect);
    expect(document.documentElement.getAttribute(SCHEME_ATTRIBUTE)).toBe(
      "dark"
    );
    expect(localStorage.getItem(SCHEME_STORAGE_KEY)).toBe("dark");

    Effect.runSync(SchemeSwitch.PinScheme({ scheme: "System" }).effect);
    expect(document.documentElement.hasAttribute(SCHEME_ATTRIBUTE)).toBe(false);
    expect(localStorage.getItem(SCHEME_STORAGE_KEY)).toBeNull();
  });

  it("switches the page and completes where storage refuses", () => {
    vi.stubGlobal("localStorage", { setItem: refuse, removeItem: refuse });

    expect(
      Effect.runSync(SchemeSwitch.PinScheme({ scheme: "Plum" }).effect)
    ).toStrictEqual(SchemeSwitch.Message.CompletedPinScheme());
    expect(document.documentElement.getAttribute(SCHEME_ATTRIBUTE)).toBe(
      "dark"
    );

    expect(
      Effect.runSync(SchemeSwitch.PinScheme({ scheme: "System" }).effect)
    ).toStrictEqual(SchemeSwitch.Message.CompletedPinScheme());
    expect(document.documentElement.hasAttribute(SCHEME_ATTRIBUTE)).toBe(false);
  });

  it("reads the scheme pinned on <html> on init, and System without one", () => {
    expect(readScheme()).toStrictEqual([
      SchemeSwitch.Message.CompletedReadScheme({ scheme: "System" }),
    ]);

    document.documentElement.setAttribute(SCHEME_ATTRIBUTE, "dark");

    expect(readScheme()).toStrictEqual([
      SchemeSwitch.Message.CompletedReadScheme({ scheme: "Plum" }),
    ]);
  });
});

describe("SchemeSwitch view", () => {
  it("presses the scheme in force and pins the one pressed", () => {
    Scene.scene(
      {
        update: SchemeSwitch.update,
        view: SchemeSwitch.view,
      },
      Scene.given(schemeSwitchInit.model),
      Scene.expect(Scene.role("group", { name: "Palette" })).toExist(),
      Scene.expect(Scene.role("button", { name: "system" })).toHaveAttr(
        "aria-pressed",
        "true"
      ),
      Scene.expect(Scene.role("button", { name: "plum" })).toHaveAttr(
        "aria-pressed",
        "false"
      ),
      Scene.click(Scene.role("button", { name: "plum" })),
      Scene.Command.resolve(
        SchemeSwitch.PinScheme,
        SchemeSwitch.Message.CompletedPinScheme()
      ),
      Scene.expect(Scene.role("button", { name: "plum" })).toHaveAttr(
        "aria-pressed",
        "true"
      )
    );
  });
});

describe("SchemeSwitch subscriptions", () => {
  it("starts with the palette the system prefers", async () => {
    const { schemeSwitchSystemPalette: systemPalette } =
      SchemeSwitch.subscriptions;

    const first = await Effect.runPromise(
      Stream.runHead(
        systemPalette.dependenciesToStream(
          systemPalette.modelToDependencies(schemeSwitchInit.model)
        )
      )
    );

    expect(first).toStrictEqual(
      expect.objectContaining({
        value: SchemeSwitch.Message.UpdatedSystemPalette({
          palette: window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "Plum"
            : "Paper",
        }),
      })
    );
  });
});
