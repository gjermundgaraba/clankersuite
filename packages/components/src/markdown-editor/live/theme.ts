import { EditorView } from "@codemirror/view";

const PIXEL_LABEL = {
  fontFamily: "var(--semantic-font-family-ui)",
  fontWeight: "400",
  textTransform: "uppercase",
  letterSpacing: "var(--semantic-dimension-letter-spacing-label)",
};

const CODE = {
  fontFamily: "var(--semantic-font-family-code)",
  fontSize: "var(--semantic-dimension-font-size-control)",
};

/** The live layer's look, in semantic tokens alone, so both colour schemes hold. */
export const liveMarkdownTheme = EditorView.baseTheme({
  "&": {
    color: "var(--semantic-color-text-primary)",
    background: "var(--semantic-color-background-surface)",
  },
  "&.cm-focused": { outline: "none" },
  ".cm-scroller": {
    fontFamily: "var(--semantic-font-family-body)",
    fontSize: "var(--semantic-dimension-font-size-body)",
    lineHeight: "1.5",
    overflow: "auto",
  },
  ".cm-content": {
    padding: "2px 0",
    caretColor: "var(--semantic-color-text-primary)",
  },
  ".cm-content ::selection": {
    background: "var(--semantic-color-background-fill-inverse)",
    color: "var(--semantic-color-text-on-inverse-fill)",
  },
  ".cm-cursor": { borderLeftColor: "var(--semantic-color-border-primary)" },
  ".cm-line": { padding: "0" },

  ".lmd-h": {
    fontWeight: "var(--semantic-font-weight-prose-heading)",
    lineHeight: "1.3",
  },
  ".lmd-h1, .lmd-h2": {
    fontSize: "var(--semantic-dimension-font-size-prose-heading-2)",
  },
  ".lmd-h3": {
    fontSize: "var(--semantic-dimension-font-size-prose-heading-3)",
  },
  ".lmd-h4": {
    ...PIXEL_LABEL,
    fontSize: "var(--semantic-dimension-font-size-control)",
  },
  ".lmd-h5": { fontSize: "var(--semantic-dimension-font-size-body)" },
  ".lmd-h6": {
    ...PIXEL_LABEL,
    fontSize: "var(--semantic-dimension-font-size-label)",
    color: "var(--semantic-color-text-secondary)",
  },

  ".lmd-strong": { fontWeight: "var(--semantic-font-weight-prose-heading)" },
  ".lmd-em": { fontStyle: "italic" },
  ".lmd-strike, .lmd-done": {
    textDecoration: "line-through",
    color: "var(--semantic-color-text-secondary)",
  },
  ".lmd-code": {
    ...CODE,
    background: "var(--semantic-color-background-head)",
    padding: "1px 5px",
  },
  ".lmd-link": {
    color: "var(--semantic-color-text-primary)",
    textDecoration: "underline",
    textDecorationThickness: "var(--semantic-dimension-border-width-divider)",
    textUnderlineOffset: "3px",
  },

  ".lmd-codeblock": {
    ...CODE,
    background: "var(--semantic-color-background-head)",
    padding: "0 var(--semantic-dimension-space-gap-inline) !important",
  },
  ".lmd-table": CODE,
  ".lmd-quote": {
    borderLeft:
      "var(--semantic-dimension-border-width-divider) solid var(--semantic-color-border-primary)",
    paddingLeft: "var(--semantic-dimension-space-gap-body) !important",
    color: "var(--semantic-color-text-secondary)",
  },
  ".lmd-hr": {
    height: "0.8em",
    background:
      "linear-gradient(var(--semantic-color-border-divider), var(--semantic-color-border-divider)) center / 100% var(--semantic-dimension-border-width-divider) no-repeat",
  },

  ".lmd-bullet": {
    color: "var(--semantic-color-text-secondary)",
    display: "inline-block",
    minWidth: "0.7em",
  },
  ".lmd-check": {
    width: "auto",
    margin: "0 var(--semantic-dimension-space-gap-inline) 0 0",
    verticalAlign: "-2px",
    cursor: "pointer",
    accentColor: "var(--semantic-color-background-fill-inverse)",
  },

  ".lmd-img": {
    display: "block",
    maxWidth: "100%",
    maxHeight: "480px",
    margin: "var(--semantic-dimension-space-gap-inline) 0",
  },
  ".lmd-img-note": {
    color: "var(--semantic-color-text-secondary)",
    fontStyle: "italic",
  },

  ".lmd-table-widget": { cursor: "text", padding: "2px 0" },
  ".lmd-table-view": { borderCollapse: "collapse" },
  ".lmd-table-view th, .lmd-table-view td": {
    border:
      "var(--semantic-dimension-border-width-divider) solid var(--semantic-color-border-divider)",
    padding: "3px var(--semantic-dimension-space-gap-inline)",
    textAlign: "left",
  },
});
