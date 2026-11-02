// @vitest-environment node
import { describe, expect, it } from "vite-plus/test";

import { safeHref, safeImageSource } from "./link-policy.ts";

const PAGE = "https://wtf.example/tasks/1";

describe("safeHref", () => {
  it.each([
    ["http", "http://example.com/a", "http://example.com/a"],
    ["https", "https://example.com/a", "https://example.com/a"],
    ["mailto", "mailto:someone@example.com", "mailto:someone@example.com"],
    ["javascript", "javascript:alert(1)", undefined],
    ["data", "data:text/html,<script>alert(1)</script>", undefined],
    ["vbscript", "vbscript:msgbox(1)", undefined],
    ["file", "file:///etc/passwd", undefined],
  ])("treats the %s scheme by the allowlist", (_, url, expected) => {
    expect(safeHref(url, PAGE)).toBe(expected);
  });

  it.each([
    ["HTTPS://EXAMPLE.com/A", "https://example.com/A"],
    ["MailTo:someone@example.com", "mailto:someone@example.com"],
  ])("takes %s in any case", (url, expected) => {
    expect(safeHref(url, PAGE)).toBe(expected);
  });

  it.each([
    ["mixed case", "JaVaScRiPt:alert(1)"],
    ["a tab", "java\tscript:alert(1)"],
    ["a newline", "java\nscript:alert(1)"],
    ["a leading space", " javascript:alert(1)"],
    ["a leading control character", "\u0001javascript:alert(1)"],
  ])("refuses a script hidden by %s", (_, url) => {
    expect(safeHref(url, PAGE)).toBeUndefined();
  });

  it.each([
    ["/tasks/2", "https://wtf.example/tasks/2"],
    ["#notes", "https://wtf.example/tasks/1#notes"],
  ])(
    "resolves %s against the page, as the preview's links did",
    (url, href) => {
      expect(safeHref(url, PAGE)).toBe(href);
    }
  );
});

describe("safeImageSource", () => {
  it.each([
    ["http://example.com/a.png", "http://example.com/a.png"],
    ["HTTPS://example.com/a.png", "https://example.com/a.png"],
    ["/a.png", "https://wtf.example/a.png"],
  ])("fetches %s", (url, expected) => {
    expect(safeImageSource(url, PAGE)).toBe(expected);
  });

  it.each([
    "mailto:someone@example.com",
    "javascript:alert(1)",
    "java\tscript:alert(1)",
    "data:image/svg+xml,<svg onload='alert(1)'/>",
    "file:///etc/passwd",
  ])("leaves %s unfetched", (url) => {
    expect(safeImageSource(url, PAGE)).toBeUndefined();
  });
});
