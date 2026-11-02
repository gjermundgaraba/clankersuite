const LINK_PROTOCOLS: ReadonlySet<string> = new Set([
  "http:",
  "https:",
  "mailto:",
]);

const IMAGE_PROTOCOLS: ReadonlySet<string> = new Set(["http:", "https:"]);

const allowedUrl = (
  protocols: ReadonlySet<string>,
  url: string,
  base: string
): string | undefined => {
  const parsed = URL.parse(url, base);

  return parsed !== null && protocols.has(parsed.protocol)
    ? parsed.href
    : undefined;
};

/** A link's target as an absolute URL, when it is one a click may open. The browser's own
 *  URL parser decides, so a tab, a newline or mixed case cannot hide a scheme from it. */
export const safeHref = (url: string, base: string): string | undefined =>
  allowedUrl(LINK_PROTOCOLS, url, base);

/** An image's source as an absolute URL, when the page may fetch it on render. */
export const safeImageSource = (
  url: string,
  base: string
): string | undefined => allowedUrl(IMAGE_PROTOCOLS, url, base);
