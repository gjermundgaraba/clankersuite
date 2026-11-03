import { setup } from "foldkit/test/vitest";
import { beforeEach } from "vite-plus/test";

setup();

beforeEach(() => {
  if (!("document" in globalThis)) {
    return;
  }

  document.body.replaceChildren();

  for (const name of document.documentElement.getAttributeNames()) {
    document.documentElement.removeAttribute(name);
  }

  localStorage.clear();
});
