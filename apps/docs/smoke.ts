import { spawn } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { setTimeout as sleep } from "node:timers/promises";

import { Predicate } from "effect";
import { chromium } from "playwright";

const APP = import.meta.dirname;
const MOUNT = 800;
const RENDER = 150;

const freePort = async (): Promise<number> => {
  const probe = createServer();
  probe.listen(0, "127.0.0.1");
  await once(probe, "listening");
  const address = probe.address();

  const port =
    address === null || Predicate.isString(address) ? 0 : address.port;

  probe.close();

  return port;
};

const preview = (port: number): ChildProcess =>
  spawn(
    "vp",
    ["preview", "--host", "127.0.0.1", "--port", `${port}`, "--strictPort"],
    { cwd: APP, detached: true, stdio: "ignore" }
  );

const waitFor = async (url: string, timeout = 20_000): Promise<void> => {
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    const isUp = await fetch(url)
      .then((response) => response.ok)
      .catch(() => false);

    if (isUp) {
      return;
    }

    await sleep(200);
  }

  throw new Error(`vp preview did not answer at ${url}`);
};

type StageSize = readonly [children: number, height: number];

const port = await freePort();
const server = preview(port);
const base = `http://127.0.0.1:${port}`;
const problems: string[] = [];

try {
  await waitFor(base);
  const browser = await chromium.launch();

  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
  });

  let errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(message.text());
    }
  });

  await page.goto(base);
  await page.waitForTimeout(MOUNT);

  const hrefs = await page.$$eval(".site-nav a", (links) =>
    links.map((link) => link.getAttribute("href") ?? "")
  );

  if (hrefs.length < 80) {
    problems.push(`the navigation lists ${hrefs.length} pages`);
  }

  for (const href of hrefs) {
    errors = [];
    await page.goto(`${base}${href}`);
    await page.waitForTimeout(MOUNT);

    const stages: readonly StageSize[] = await page.$$eval(
      ".site-example-stage",
      (elements) =>
        elements.map((element): StageSize => [
          element.children.length,
          element.getBoundingClientRect().height,
        ])
    );

    const empty = stages.filter(
      ([children, height]) => children === 0 || height < 30
    ).length;

    const mains = await page.locator("main").count();

    const current = await page
      .locator('.site-nav a[aria-current="page"]')
      .evaluateAll((links) => links.map((link) => link.getAttribute("href")));

    if (empty > 0) {
      problems.push(`${href}: ${empty} of ${stages.length} examples are empty`);
    }

    if (mains !== 1) {
      problems.push(`${href}: ${mains} main landmarks`);
    }

    if (current.length !== 1 || current[0] !== href) {
      problems.push(`${href}: the navigation marks ${current.join(", ")}`);
    }

    problems.push(...errors.map((error) => `${href}: ${error}`));
  }

  await page.goto(`${base}/no-such-page`);
  await page.waitForTimeout(MOUNT);

  if (
    (await page.getByRole("heading", { level: 1 }).textContent()) !==
    "Not found"
  ) {
    problems.push("/no-such-page: the page does not say it was not found");
  }

  await page.goto(`${base}/components/button`);
  await page.waitForTimeout(MOUNT);
  const send = page.getByRole("button", { name: "send" });
  await send.click();
  await page.waitForTimeout(RENDER);

  if ((await send.getAttribute("aria-busy")) !== "true") {
    problems.push("/components/button: send is not busy after a press");
  }

  await page
    .locator(".gg-topbar")
    .getByRole("button", { name: "Plum" })
    .click();
  await page.waitForTimeout(RENDER);

  if (
    (await page.evaluate(
      () => document.documentElement.dataset["colorScheme"]
    )) !== "dark"
  ) {
    problems.push("the scheme switch does not pin plum");
  }

  if ((await send.getAttribute("aria-busy")) !== "true") {
    problems.push("/components/button: a scheme switch reset the example");
  }

  await browser.close();
} finally {
  if (server.pid !== undefined) {
    process.kill(-server.pid);
  }
}

if (problems.length > 0) {
  console.error(problems.join("\n"));
  process.exit(1);
}

console.log("every page loads, and every example on it runs");
