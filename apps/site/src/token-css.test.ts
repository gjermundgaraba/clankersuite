import { describe, expect, it } from "vite-plus/test";

import { isUnder, parseTokens, resolve, tokensUnder } from "./token-css.ts";

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
:root[data-color-scheme="dark"] {
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

describe("tokensUnder", () => {
  const tokens = parseTokens(`:root {
    --text: #111;
    --text-quiet: #222;
    --textured: url(a.png);
    --u: 1rem;
  }`);

  it("takes the token a prefix names and the tokens in its group, in file order", () => {
    expect(tokensUnder(tokens, "--text").map(({ name }) => name)).toStrictEqual(
      ["--text", "--text-quiet"]
    );
  });

  it("takes no token whose name only begins with the same letters", () => {
    expect(isUnder("--text", "--textured")).toBe(false);
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

  it("follows every alias in a value of several parts, in each scheme", () => {
    expect(resolve(tokens, "var(--u) var(--u) 0 var(--ink)")).toStrictEqual({
      light: "0.5rem 0.5rem 0 #111",
      dark: "0.5rem 0.5rem 0 rgb(238, 238, 238)",
    });
  });

  it("returns a value with nothing to follow, or an alias to no token, as written", () => {
    expect(resolve(tokens, "0.5rem")).toBe("0.5rem");
    expect(resolve(tokens, "var(--missing)")).toBe("var(--missing)");
  });

  it("stops at an alias that names itself", () => {
    const looped = parseTokens(":root { --a: var(--b); --b: var(--a) }");

    expect(resolve(looped, "var(--a)")).toBe("var(--a)");
  });
});
