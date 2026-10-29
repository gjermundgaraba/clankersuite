/** Where a pinned scheme is remembered on this device, in `localStorage`. */
export const SCHEME_STORAGE_KEY = "pixel-paper-scheme";

/** The attribute on `<html>` a pinned scheme is written to: `data-scheme="light"` or
    `"dark"`. Without it the stylesheet follows the reader's system. */
export const SCHEME_ATTRIBUTE = "data-scheme";

/** Inline this in `<head>`, before the stylesheet paints, so a remembered scheme never
    flashes the other one first. Blocked storage leaves the page on the system's scheme. */
export const schemeScript = `try{var s=localStorage.getItem("${SCHEME_STORAGE_KEY}");if(s==="light"||s==="dark")document.documentElement.setAttribute("${SCHEME_ATTRIBUTE}",s);}catch(e){}`;
