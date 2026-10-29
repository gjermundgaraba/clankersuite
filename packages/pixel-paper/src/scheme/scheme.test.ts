// @vitest-environment-options { "settings": { "enableJavaScriptEvaluation": true, "suppressInsecureJavaScriptEnvironmentWarning": true } }
import { Option } from "effect";
import { describe, expect, it } from "vite-plus/test";

import { fromPinnedValue, toPinnedValue } from "./scheme.ts";
import {
  SCHEME_ATTRIBUTE,
  SCHEME_STORAGE_KEY,
  schemeScript,
} from "./script.ts";

const runSchemeScript = (): void => {
  const script = document.createElement("script");
  script.textContent = schemeScript;
  document.head.append(script);
  script.remove();
};

describe("Scheme", () => {
  it("pins paper and plum, and lets the system choose otherwise", () => {
    expect(toPinnedValue("Paper")).toStrictEqual(Option.some("light"));
    expect(toPinnedValue("Plum")).toStrictEqual(Option.some("dark"));
    expect(toPinnedValue("System")).toStrictEqual(Option.none());
    expect(fromPinnedValue("dark")).toBe("Plum");
    expect(fromPinnedValue("sepia")).toBe("System");
    expect(fromPinnedValue(null)).toBe("System");
  });
});

describe("schemeScript", () => {
  it("applies a remembered scheme to <html> before the page runs", () => {
    localStorage.setItem(SCHEME_STORAGE_KEY, "dark");

    runSchemeScript();

    expect(document.documentElement.getAttribute(SCHEME_ATTRIBUTE)).toBe(
      "dark"
    );
  });

  it("ignores a stored value it does not know", () => {
    localStorage.setItem(SCHEME_STORAGE_KEY, "sepia");

    runSchemeScript();

    expect(document.documentElement.hasAttribute(SCHEME_ATTRIBUTE)).toBe(false);
  });
});
