import { EditorView } from "@codemirror/view";

const PIXEL_LABEL = {
  fontFamily: "var(--font-px)",
  fontWeight: "400",
  textTransform: "uppercase",
  letterSpacing: "var(--tracking-label)",
};

const CODE = {
  fontFamily: "var(--font-code)",
  fontSize: "var(--type-control)",
};

/** The live layer's look, in `tokens.css` values alone, so paper and plum both hold. */
export const liveMarkdownTheme = EditorView.baseTheme({
  "&": { color: "var(--ink)", background: "var(--paper)" },
  "&.cm-focused": { outline: "none" },
  ".cm-scroller": {
    fontFamily: "var(--font-body)",
    fontSize: "var(--type-body)",
    lineHeight: "1.5",
    overflow: "auto",
  },
  ".cm-content": { padding: "2px 0", caretColor: "var(--ink)" },
  ".cm-content ::selection": {
    background: "var(--ink)",
    color: "var(--paper)",
  },
  ".cm-cursor": { borderLeftColor: "var(--ink)" },
  ".cm-line": { padding: "0" },

  ".lmd-h": { fontWeight: "var(--read-weight)", lineHeight: "1.3" },
  ".lmd-h1, .lmd-h2": { fontSize: "var(--read-h2)" },
  ".lmd-h3": { fontSize: "var(--read-h3)" },
  ".lmd-h4": { ...PIXEL_LABEL, fontSize: "var(--type-control)" },
  ".lmd-h5": { fontSize: "var(--type-body)" },
  ".lmd-h6": {
    ...PIXEL_LABEL,
    fontSize: "var(--type-label)",
    color: "var(--muted)",
  },

  ".lmd-strong": { fontWeight: "var(--read-weight)" },
  ".lmd-em": { fontStyle: "italic" },
  ".lmd-strike, .lmd-done": {
    textDecoration: "line-through",
    color: "var(--muted)",
  },
  ".lmd-code": { ...CODE, background: "var(--head)", padding: "1px 5px" },
  ".lmd-link": {
    color: "var(--ink)",
    textDecoration: "underline",
    textDecorationThickness: "var(--hair)",
    textUnderlineOffset: "3px",
  },

  ".lmd-codeblock": {
    ...CODE,
    background: "var(--head)",
    padding: "0 var(--space-s) !important",
  },
  ".lmd-table": CODE,
  ".lmd-quote": {
    borderLeft: "var(--hair) solid var(--ink)",
    paddingLeft: "var(--space-m) !important",
    color: "var(--muted)",
  },
  ".lmd-hr": {
    height: "0.8em",
    background:
      "linear-gradient(var(--rule), var(--rule)) center / 100% var(--hair) no-repeat",
  },

  ".lmd-bullet": {
    color: "var(--muted)",
    display: "inline-block",
    minWidth: "0.7em",
  },
  ".lmd-check": {
    width: "auto",
    margin: "0 var(--space-s) 0 0",
    verticalAlign: "-2px",
    cursor: "pointer",
    accentColor: "var(--ink)",
  },

  ".lmd-img": {
    display: "block",
    maxWidth: "100%",
    maxHeight: "480px",
    margin: "var(--space-s) 0",
  },
  ".lmd-img-note": { color: "var(--muted)", fontStyle: "italic" },

  ".lmd-table-widget": { cursor: "text", padding: "2px 0" },
  ".lmd-table-view": { borderCollapse: "collapse" },
  ".lmd-table-view th, .lmd-table-view td": {
    border: "var(--hair) solid var(--rule)",
    padding: "3px var(--space-s)",
    textAlign: "left",
  },
});
