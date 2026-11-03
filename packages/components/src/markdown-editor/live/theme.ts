import { EditorView } from "@codemirror/view";

const PIXEL_LABEL = {
  fontFamily: "var(--semantic-font-family-ui)",
  fontWeight: "var(--semantic-font-weight-regular)",
  textTransform: "uppercase",
  letterSpacing: "var(--semantic-dimension-letter-spacing-label)",
};

const CODE = {
  fontFamily: "var(--semantic-font-family-code)",
  fontSize: "var(--semantic-dimension-font-size-control)",
};

/** The live layer's look, in semantic tokens alone, so both colour schemes hold and a
 *  brand restyles it. */
export const LIVE_MARKDOWN_STYLE = {
  "&": {
    color: "var(--semantic-color-text-primary)",
    background: "var(--semantic-color-background-surface)",
  },
  "&.cm-focused": { outline: "none" },
  ".cm-scroller": {
    fontFamily: "var(--semantic-font-family-body)",
    fontSize: "var(--semantic-dimension-font-size-body)",
    lineHeight: "var(--semantic-number-line-height-textarea)",
    overflow: "auto",
  },
  ".cm-content": {
    padding: "var(--semantic-dimension-space-control-padding-block-xx-small) 0",
    caretColor: "var(--semantic-color-text-primary)",
  },
  ".cm-content ::selection": {
    background: "var(--semantic-color-background-fill-inverse)",
    color: "var(--semantic-color-text-on-inverse-fill)",
  },
  ".cm-cursor": { borderLeftColor: "var(--semantic-color-border-primary)" },
  ".cm-line": { padding: "0" },

  ".gg-md-h": {
    fontWeight: "var(--semantic-font-weight-prose-heading)",
    lineHeight: "var(--semantic-number-line-height-heading)",
  },
  ".gg-md-h1, .gg-md-h2": {
    fontSize: "var(--semantic-dimension-font-size-prose-heading-2)",
  },
  ".gg-md-h3": {
    fontSize: "var(--semantic-dimension-font-size-prose-heading-3)",
  },
  ".gg-md-h4": {
    ...PIXEL_LABEL,
    fontSize: "var(--semantic-dimension-font-size-control)",
  },
  ".gg-md-h5": { fontSize: "var(--semantic-dimension-font-size-body)" },
  ".gg-md-h6": {
    ...PIXEL_LABEL,
    fontSize: "var(--semantic-dimension-font-size-label)",
    color: "var(--semantic-color-text-secondary)",
  },

  ".gg-md-strong": { fontWeight: "var(--semantic-font-weight-prose-heading)" },
  ".gg-md-em": { fontStyle: "italic" },
  ".gg-md-strike, .gg-md-done": {
    textDecoration: "line-through",
    color: "var(--semantic-color-text-secondary)",
  },
  ".gg-md-code": {
    ...CODE,
    background: "var(--semantic-color-background-head)",
    padding:
      "var(--semantic-dimension-space-control-padding-block-xxx-small) var(--semantic-dimension-space-control-padding-inline-x-small)",
  },
  ".gg-md-link": {
    color: "var(--semantic-color-text-primary)",
    textDecoration: "underline",
    textDecorationThickness: "var(--semantic-dimension-border-width-divider)",
    textUnderlineOffset: "var(--semantic-dimension-space-underline-offset)",
  },

  ".gg-md-codeblock": {
    ...CODE,
    background: "var(--semantic-color-background-head)",
    padding: "0 var(--semantic-dimension-space-gap-inline) !important",
  },
  ".gg-md-table": CODE,
  ".gg-md-quote": {
    borderLeft:
      "var(--semantic-dimension-border-width-divider) solid var(--semantic-color-border-primary)",
    paddingLeft: "var(--semantic-dimension-space-gap-body) !important",
    color: "var(--semantic-color-text-secondary)",
  },
  ".gg-md-hr": {
    height: "0.8em",
    background:
      "linear-gradient(var(--semantic-color-border-divider), var(--semantic-color-border-divider)) center / 100% var(--semantic-dimension-border-width-divider) no-repeat",
  },

  ".gg-md-bullet": {
    color: "var(--semantic-color-text-secondary)",
    display: "inline-block",
    minWidth: "0.7em",
  },
  ".gg-md-check": {
    width: "auto",
    margin: "0 var(--semantic-dimension-space-gap-inline) 0 0",
    verticalAlign: "calc(-1 * var(--semantic-dimension-travel-nudge-large))",
    cursor: "pointer",
    accentColor: "var(--semantic-color-background-fill-inverse)",
  },

  ".gg-md-img": {
    display: "block",
    maxWidth: "100%",
    maxHeight: "var(--semantic-dimension-size-max-height-markdown-image)",
    margin: "var(--semantic-dimension-space-gap-inline) 0",
  },
  ".gg-md-img-note": {
    color: "var(--semantic-color-text-secondary)",
    fontStyle: "italic",
  },

  ".gg-md-table-widget": {
    cursor: "text",
    padding: "var(--semantic-dimension-space-control-padding-block-xx-small) 0",
  },
  ".gg-md-table-view": { borderCollapse: "collapse" },
  ".gg-md-table-view th, .gg-md-table-view td": {
    border:
      "var(--semantic-dimension-border-width-divider) solid var(--semantic-color-border-divider)",
    padding:
      "var(--semantic-dimension-space-control-padding-block-x-small) var(--semantic-dimension-space-gap-inline)",
    textAlign: "left",
  },
};

export const liveMarkdownTheme = EditorView.baseTheme(LIVE_MARKDOWN_STYLE);
