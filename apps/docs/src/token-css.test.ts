import { describe, expect, it } from "vite-plus/test";

import { groupTokens, parseTokens, resolve } from "./token-css.ts";
import type { Section } from "./token-css.ts";

const CSS = `
/* Colour. The page's inks. */
:root {
  --ink: light-dark(#111, rgb(238, 238, 238)); /* headings and rules */
  --text: var(--ink);
  /* --commented-out: 1px; */
  --rule: color-mix(in srgb, var(--ink) 20%, transparent); /* --not-a-token: 1; */
  --u:
    0.5rem;
  --grain: url('data:image/svg+xml;utf8,<svg width="4"></svg>'); /* the veil's grain */
}
:root[data-scheme="dark"] {
  --u: 1rem;
}
`;

describe("parseTokens", () => {
  it("lists every custom property once, in source order, with its value as written", () => {
    expect(parseTokens(CSS)).toStrictEqual([
      { name: "--ink", value: "light-dark(#111, rgb(238, 238, 238))" },
      { name: "--text", value: "var(--ink)" },
      {
        name: "--rule",
        value: "color-mix(in srgb, var(--ink) 20%, transparent)",
      },
      { name: "--u", value: "0.5rem" },
      {
        name: "--grain",
        value: `url('data:image/svg+xml;utf8,<svg width="4"></svg>')`,
      },
    ]);
  });

  it("reads a value whole through unquoted and nested parentheses", () => {
    const css = `:root {
      --grain: url(data:image/svg+xml;utf8,AAAA); /* unquoted */
      --pair: light-dark(url(data:a;b), url(data:c;d));
      --next: 1px;
    }`;

    expect(parseTokens(css)).toStrictEqual([
      { name: "--grain", value: "url(data:image/svg+xml;utf8,AAAA)" },
      { name: "--pair", value: "light-dark(url(data:a;b), url(data:c;d))" },
      { name: "--next", value: "1px" },
    ]);
  });

  it("ends a block's last declaration at the brace that closes it", () => {
    expect(
      parseTokens(":root { --a: 1px; --b: 2px }\n.x { --c: 3px }")
    ).toStrictEqual([
      { name: "--a", value: "1px" },
      { name: "--b", value: "2px" },
      { name: "--c", value: "3px" },
    ]);
  });

  it("reads no custom property in a selector, only the block's declarations", () => {
    expect(
      parseTokens(".button--primary:hover { --a: 1px; /* a */ --b: 2px }")
    ).toStrictEqual([
      { name: "--a", value: "1px" },
      { name: "--b", value: "2px" },
    ]);
  });

  it("reads no custom property in an @supports condition", () => {
    expect(
      parseTokens("@supports (--x: 1) {\n  :root { --c: 3px }\n}")
    ).toStrictEqual([{ name: "--c", value: "3px" }]);
  });

  it("reads past an escaped quote and a comment inside a value", () => {
    const css = `:root {
      --quote: "a\\";b";
      --escaped: a\\;b;
      --noted: 1px /* it's; */;
      --next: 1px;
    }`;

    expect(parseTokens(css)).toStrictEqual([
      { name: "--quote", value: '"a\\";b"' },
      { name: "--escaped", value: "a\\;b" },
      { name: "--noted", value: "1px /* it's; */" },
      { name: "--next", value: "1px" },
    ]);
  });

  it("throws, naming the token, on a quote, comment or parenthesis never closed", () => {
    expect(() => parseTokens(':root { --a: 1px; --b: "x; }')).toThrow("--b");
    expect(() => parseTokens(":root { --c: 1px /* x; }")).toThrow("--c");
    expect(() => parseTokens(":root { --d: url(x; }")).toThrow("--d");
  });

  it("reads a value the formatter broke across lines as written on one", () => {
    expect(
      parseTokens(
        ':root {\n  --link: light-dark(\n    color-mix(in oklch, red, blue),\n    blue\n  );\n  --mark: url(\n    "a (  b ).svg"\n  );\n}'
      )
    ).toStrictEqual([
      {
        name: "--link",
        value: "light-dark(color-mix(in oklch, red, blue), blue)",
      },
      { name: "--mark", value: 'url("a (  b ).svg")' },
    ]);
  });
});

describe("groupTokens", () => {
  const tokens = parseTokens(`:root {
    --ink: #111;
    --text: #222;
    --u: 1rem;
    --gap: 2rem;
  }`);

  const names = (sections: readonly Section[]) =>
    groupTokens(tokens, sections).map(({ heading, tokens: grouped }) => ({
      heading,
      names: grouped.map(({ name }) => name),
    }));

  it("puts each token under the last section that starts at or before it, in file order", () => {
    expect(
      names([
        { heading: "Colour", from: "--ink" },
        { heading: "Space", from: "--u" },
      ])
    ).toStrictEqual([
      { heading: "Colour", names: ["--ink", "--text"] },
      { heading: "Space", names: ["--u", "--gap"] },
    ]);
  });

  it("throws on a section that starts at an undeclared token, naming it", () => {
    expect(() => names([{ heading: "Colour", from: "--inc" }])).toThrow(
      "--inc"
    );
  });

  it("throws on a section that starts at or before the one before it", () => {
    expect(() =>
      names([
        { heading: "Colour", from: "--ink" },
        { heading: "Space", from: "--u" },
        { heading: "Type", from: "--text" },
      ])
    ).toThrow("Type");
  });

  it("throws on a token declared before every section, naming it", () => {
    expect(() => names([{ heading: "Space", from: "--u" }])).toThrow("--ink");
  });
});

describe("resolve", () => {
  const tokens = parseTokens(CSS);

  it("splits light-dark() at its top level", () => {
    expect(
      resolve(tokens, "light-dark(#111, rgb(238, 238, 238))")
    ).toStrictEqual({
      light: "#111",
      dark: "rgb(238, 238, 238)",
    });
  });

  it("follows an alias to what it names", () => {
    expect(resolve(tokens, "var(--text)")).toStrictEqual({
      light: "#111",
      dark: "rgb(238, 238, 238)",
    });
  });

  it("follows aliases inside light-dark()", () => {
    expect(resolve(tokens, "light-dark(var(--u), var(--ink))")).toStrictEqual({
      light: "0.5rem",
      dark: "rgb(238, 238, 238)",
    });
  });

  it("returns a value with nothing to follow, or an alias to no token, as written", () => {
    expect(resolve(tokens, "0.5rem")).toBe("0.5rem");
    expect(resolve(tokens, "var(--missing)")).toBe("var(--missing)");
  });
});
