import { Buffer } from "node:buffer";
import { spawn } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { setTimeout as sleep } from "node:timers/promises";

import { Predicate } from "effect";
import { chromium } from "playwright";
import type { Locator, Page } from "playwright";

import { componentsRouter, foundationsRouter, screenUrl } from "./src/route.ts";
import { Slug } from "./src/screen/slugs.ts";

const APP = import.meta.dirname;
const SETTLE = 400;
const HYDRATE = 1200;

const PIXEL_PNG =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

const ROUTES = [
  foundationsRouter(),
  componentsRouter(),
  ...Slug.literals.map(screenUrl),
];

const NUMBER = /^(?<amount>-?\d*\.?\d+)(?<unit>[a-z%]*)$/u;

const numberIn = (what: string, text: string, unit: "px" | ""): number => {
  const groups = NUMBER.exec(text.trim())?.groups;
  const amount = groups?.["amount"];

  if (amount === undefined || groups?.["unit"] !== unit) {
    throw new Error(
      `${what} is not a number${unit === "" ? "" : ` in ${unit}`}: "${text}".`
    );
  }

  return Number(amount);
};

const freePort = async (): Promise<number> => {
  const probe = createServer();
  probe.listen(0, "127.0.0.1");
  await once(probe, "listening");
  const address = probe.address();

  const port =
    address === null || Predicate.isString(address) ? 0 : address.port;

  probe.close();
  await once(probe, "close");

  return port;
};

const preview = (port: number): ChildProcess =>
  spawn(
    "vp",
    [
      "preview",
      "--host",
      "127.0.0.1",
      "--port",
      `${port}`,
      "--strictPort",
      "--outDir",
      "dist",
    ],
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

const port = await freePort();
const server = preview(port);
const base = `http://127.0.0.1:${port}`;
const results: Array<{ name: string; isPass: boolean; detail: string }> = [];
const problems: string[] = [];

const check = (name: string, isPass: boolean, detail = ""): void => {
  results.push({ name, isPass, detail });
};

const watch = (page: Page): void => {
  page.on("pageerror", (error) =>
    problems.push(`page error: ${error.message}`)
  );
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      problems.push(`console ${message.type()}: ${message.text()}`);
    }
  });
};

try {
  await waitFor(base);
  const browser = await chromium.launch();

  try {
    const page = await browser.newPage();
    watch(page);
    const html = page.locator("html");

    const settle = async (): Promise<void> => {
      await page.waitForTimeout(SETTLE);
    };

    const focusedId = async (): Promise<string | undefined> =>
      await page.evaluate(() => document.activeElement?.id);

    const focusedText = async (): Promise<string | undefined> =>
      await page.evaluate(() => document.activeElement?.textContent?.trim());

    for (const route of ROUTES) {
      const before = problems.length;
      await page.goto(`${base}${route}`);
      await page.waitForTimeout(HYDRATE);
      const title = await page.title();
      check(
        `${route} loads and hydrates cleanly`,
        problems.length === before && title.endsWith("pixel paper"),
        problems.slice(before).join(" | ")
      );
    }

    await page.goto(`${base}${componentsRouter()}`);
    await page.waitForTimeout(HYDRATE);
    await page.evaluate(() => Object.assign(window, { smokeSamePage: true }));

    const isSamePage = async (): Promise<boolean> =>
      await page.evaluate(
        () => "smokeSamePage" in window && window.smokeSamePage === true
      );

    await page.keyboard.press("Tab");
    check(
      "the skip link is the first stop",
      (await focusedText()) === "Skip to content"
    );
    await page.keyboard.press("Enter");
    await settle();
    check(
      "the skip link moves focus to main",
      (await focusedId()) === "main",
      await focusedId()
    );

    await page.locator(".topbar a", { hasText: "foundations" }).click();
    await settle();
    check(
      "a top bar link goes to its page in place",
      new URL(page.url()).pathname === foundationsRouter() &&
        (await page.title()) === "pixel paper" &&
        (await isSamePage()),
      new URL(page.url()).pathname
    );

    await page.keyboard.press("g");
    await page.keyboard.press("c");
    await settle();
    check(
      "g c goes to the components",
      new URL(page.url()).pathname === componentsRouter() &&
        (await isSamePage()),
      new URL(page.url()).pathname
    );

    await page.keyboard.press("ControlOrMeta+k");
    await settle();
    const sitePalette = page.getByRole("dialog", { name: "Commands" });
    check("Mod+K opens the specimen's palette", await sitePalette.isVisible());
    await page.keyboard.type("console screen");
    await settle();
    await page.keyboard.press("Enter");
    await settle();
    check(
      "a screen command opens the screen",
      new URL(page.url()).pathname === screenUrl("console") &&
        !(await sitePalette.isVisible()) &&
        (await isSamePage()),
      new URL(page.url()).pathname
    );

    await page.goto(`${base}${componentsRouter()}`);
    await page.waitForTimeout(HYDRATE);
    const rename = page.locator("button", { hasText: "rename" });
    const renameDialog = page.getByRole("dialog", { name: "Rename" });
    await rename.click();
    await settle();
    check(
      "a dialog opens with focus in its field",
      (await renameDialog.isVisible()) &&
        (await focusedId()) === "rename-file-name",
      await focusedId()
    );
    await page.keyboard.press("Escape");
    await settle();
    check(
      "Escape closes it, focus back on its trigger",
      !(await renameDialog.isVisible()) &&
        ((await focusedText()) ?? "").includes("rename")
    );

    const pressVeil = async (): Promise<void> => {
      await page.mouse.click(8, (page.viewportSize()?.height ?? 600) / 2);
    };

    const WORK = 1200;
    await rename.click();
    await settle();
    await page.keyboard.press("End");
    await page.keyboard.type("x");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(150);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(100);
    const isRenameOpenAfterEscape = await renameDialog.isVisible();
    const renameFocus = await focusedId();
    await pressVeil();
    await page.waitForTimeout(100);
    const renameClose = renameDialog.getByRole("button", { name: "Close" });
    check(
      "a saving dialog stays open on Escape and the veil, focus on its busy save",
      isRenameOpenAfterEscape &&
        renameFocus === "rename-file-form-submit" &&
        (await renameDialog.isVisible()),
      renameFocus
    );
    check(
      "its close glyph is held and faded on the title bar",
      (await renameClose.getAttribute("aria-disabled")) === "true" &&
        (await renameClose.evaluate(
          (glyph) => getComputedStyle(glyph).opacity
        )) === "0.6"
    );
    await page.waitForTimeout(WORK);
    check(
      "it closes once saved, focus back on its trigger",
      !(await renameDialog.isVisible()) &&
        ((await focusedText()) ?? "").includes("rename")
    );

    const deleteSpec = page.locator(".spec-item", {
      hasText: "the destructive confirm",
    });

    const deleteConfirm = page.getByRole("alertdialog", { name: "Delete" });
    const commit = deleteConfirm.locator(".btn.danger");
    const cancel = deleteConfirm.getByRole("button", { name: "cancel" });
    await deleteSpec.getByRole("button", { name: "delete" }).click();
    await settle();
    await commit.click();
    await page.waitForTimeout(150);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(100);
    const isConfirmOpenAfterEscape = await deleteConfirm.isVisible();

    const isCommitFocused = await commit.evaluate(
      (button) => button === document.activeElement
    );

    const cancelShadow = await cancel.evaluate(
      (button) => getComputedStyle(button).boxShadow
    );

    await pressVeil();
    await page.waitForTimeout(100);
    check(
      "a deleting confirm stays open on Escape and the veil, focus on its commit",
      isConfirmOpenAfterEscape &&
        isCommitFocused &&
        (await deleteConfirm.isVisible())
    );
    check(
      "its held cancel prints as a held button: no ring, no shadow",
      (await cancel.getAttribute("aria-disabled")) === "true" &&
        cancelShadow === "none",
      cancelShadow
    );
    await page.waitForTimeout(WORK);
    check(
      "it closes once deleted",
      !(await deleteConfirm.isVisible()) &&
        (await deleteSpec.getByRole("button", { name: "restore" }).isVisible())
    );
    await deleteSpec.getByRole("button", { name: "restore" }).click();

    const settingsToggle = page.getByRole("button", { name: "settings" });
    await settingsToggle.focus();
    await page.keyboard.press("Enter");
    await settle();
    const settingsMenu = page.getByRole("menu", { name: "settings" });
    check("Enter opens a menu", await settingsMenu.isVisible());
    await page.keyboard.press("Escape");
    await settle();
    check(
      "Escape closes it, focus back on its toggle",
      !(await settingsMenu.isVisible()) &&
        (await settingsToggle.evaluate(
          (toggle) => toggle === document.activeElement
        ))
    );

    const hangsUnder = async (
      name: string,
      toggleName: string | RegExp,
      edge: "Start" | "End"
    ) => {
      const toggle = page.getByRole("button", { name: toggleName }).first();
      await toggle.evaluate((element) => {
        window.scrollBy(
          0,
          element.getBoundingClientRect().top - window.innerHeight / 4
        );
      });
      await toggle.click();
      await settle();
      const slip = page.getByRole("menu", { name: toggleName }).first();
      const toggleBox = await toggle.boundingBox();
      const slipBox = await slip.boundingBox();
      const width = page.viewportSize()?.width ?? 0;

      const gap =
        slipBox !== null && toggleBox !== null
          ? slipBox.y - (toggleBox.y + toggleBox.height)
          : Number.NaN;

      let offset = Number.NaN;

      if (slipBox !== null && toggleBox !== null) {
        offset =
          edge === "Start"
            ? slipBox.x - toggleBox.x
            : slipBox.x + slipBox.width - (toggleBox.x + toggleBox.width);
      }

      check(
        `${name} hangs 6px under its toggle, ${edge === "Start" ? "left" : "right"} edges aligned`,
        Math.abs(gap - 6) < 1 &&
          Math.abs(offset) < 1 &&
          slipBox !== null &&
          slipBox.width < width / 2,
        `gap ${gap}, offset ${offset}, width ${slipBox?.width} of ${width}`
      );
      await page.keyboard.press("Escape");
      await settle();
    };

    await hangsUnder("a menu", "settings", "Start");
    await hangsUnder("an end-aligned menu", /^Actions: /u, "End");

    await page.getByRole("button", { name: "settings" }).first().click();
    await settle();
    const settingsSlip = page.getByRole("menu", { name: "settings" }).first();

    const barBottom = await page
      .locator(".topbar")
      .first()
      .evaluate((bar) => bar.getBoundingClientRect().bottom);

    const settingsSlipBox = await settingsSlip.boundingBox();
    const slipTop = settingsSlipBox?.y ?? Number.NaN;
    await page.evaluate(
      (by) => {
        window.scrollBy(0, by);
      },
      slipTop + 4 - barBottom
    );
    await settle();
    const scrolledSlip = await settingsSlip.boundingBox();

    const isSlipOnTop =
      scrolledSlip !== null &&
      (await page.evaluate(
        ([x, y]) =>
          document.elementFromPoint(x, y)?.closest('[role="menu"]') !== null,
        [scrolledSlip.x + scrolledSlip.width / 2, barBottom - 1] as const
      ));

    check(
      "a menu paints over the sticky top bar",
      isSlipOnTop,
      `slip top ${scrolledSlip?.y}, bar bottom ${barBottom}`
    );
    await page.keyboard.press("Escape");
    await settle();

    const recentList = page.getByRole("list", {
      name: "Recent changes, newest first (sample)",
    });

    const recentPanel = page.locator("#sample-recent-changes");
    await recentList.scrollIntoViewIfNeeded();

    const entryBoxes = await recentList.evaluate((list) => {
      const listBox = list.getBoundingClientRect();

      return [...list.children].map((entry) => {
        const box = entry.getBoundingClientRect();

        return {
          top: box.top,
          bottom: box.bottom,
          width: box.width,
          listWidth: listBox.width,
        };
      });
    });

    check(
      "a wrapped history's entries stack, each as wide as the list",
      entryBoxes.length === 4 &&
        entryBoxes.every(
          ({ top, width, listWidth }, index) =>
            Math.abs(width - listWidth) < 1 &&
            (index === 0 ||
              top >= (entryBoxes[index - 1]?.bottom ?? Infinity) - 1)
        ),
      entryBoxes
        .map(({ top, width }) => `${Math.round(top)}:${Math.round(width)}`)
        .join(" ")
    );

    const band = await recentPanel.evaluate((panel) => {
      const titleBarBottom =
        panel.querySelector(".panel-tb")?.getBoundingClientRect().bottom ??
        Number.NaN;

      const whenTop = panel
        .querySelector("li > :first-child")
        ?.getBoundingClientRect().top;

      const padding = getComputedStyle(
        panel.querySelector(".panel-body") ?? panel
      ).paddingTop;

      return { gap: (whenTop ?? Number.NaN) - titleBarBottom, padding };
    });

    const pad = numberIn("The panel body's top padding", band.padding, "px");

    check(
      "a finished loading line takes no room above a panel's first entry",
      Math.abs(band.gap - pad) < 1,
      `first entry ${band.gap}px under the title bar, padding ${pad}px`
    );

    const sampleForm = page.locator("#forms form");
    await sampleForm.getByRole("button", { name: "save" }).click();
    await settle();
    const firstFocus = await focusedId();
    await sampleForm.getByLabel("Project").focus();
    await sampleForm.getByRole("button", { name: "save" }).click();
    await settle();
    check(
      "a failed save focuses the error summary, and the next one focuses it again",
      firstFocus === "sample-form-errors" &&
        (await focusedId()) === "sample-form-errors",
      `${firstFocus}, then ${await focusedId()}`
    );

    const briefEditor = sampleForm.locator("pp-markdown-editor");
    const briefContent = briefEditor.locator(".cm-content");
    const briefLine = briefContent.locator(".cm-line").first();
    const briefValue = sampleForm.locator("#sample-brief");
    const briefSource = "plain **bold** end";

    const isBriefFocused = async (): Promise<boolean> =>
      await page.evaluate(
        () => document.activeElement?.classList.contains("cm-content") === true
      );

    const replaceBrief = async (text: string): Promise<void> => {
      await briefContent.click();
      await page.keyboard.press("ControlOrMeta+a");
      await page.keyboard.press("Delete");
      await page.keyboard.type(text);
      await settle();
    };

    const moveCaretHome = async (rightBy: number): Promise<void> => {
      await page.keyboard.press("Home");

      for (let step = 0; step < rightBy; step += 1) {
        await page.keyboard.press("ArrowRight");
      }

      await settle();
    };

    check(
      "the Markdown editor is one textbox, named by its label",
      (await page.getByRole("textbox", { name: "Markdown editor" }).count()) ===
        1 && (await briefEditor.locator(".cm-editor").count()) === 1
    );

    await sampleForm.getByText("Markdown editor", { exact: true }).click();
    await settle();
    check(
      "a click on the Markdown editor's label focuses the editor",
      await isBriefFocused()
    );

    await page.keyboard.type(briefSource);
    await settle();
    const hiddenMarks = await briefLine.textContent();
    await moveCaretHome(8);
    const shownMarks = await briefLine.textContent();
    check(
      "the Markdown editor hides marks, and shows them around the caret",
      hiddenMarks === "plain bold end" && shownMarks === briefSource,
      `${hiddenMarks}, then ${shownMarks}`
    );
    check(
      "the Markdown editor's edits reach the Model",
      (await briefValue.inputValue()) === briefSource
    );

    await page.keyboard.press("ControlOrMeta+b");
    await page.keyboard.press("ControlOrMeta+k");
    await settle();
    const textAfterShortcuts = await briefValue.inputValue();
    const paletteOpened = await page.locator("#site-palette").isVisible();
    await page.keyboard.press("Escape");
    await settle();
    check(
      "the Markdown editor binds no formatting shortcut, and Mod-k stays the palette's",
      textAfterShortcuts === briefSource && paletteOpened
    );

    await briefContent.click();
    await page.keyboard.press("Tab");
    await settle();
    check(
      "Tab leaves the Markdown editor and changes nothing",
      !(await isBriefFocused()) &&
        (await briefValue.inputValue()) === briefSource
    );

    await briefContent.locator(".lmd-strong").scrollIntoViewIfNeeded();
    const strongBox = await briefContent.locator(".lmd-strong").boundingBox();

    if (strongBox === null) {
      throw new Error("The bold run has no box.");
    }

    await page.mouse.move(
      strongBox.x + strongBox.width / 2,
      strongBox.y + strongBox.height / 2
    );
    await page.mouse.down();
    await settle();
    const textWhileDown = await briefLine.textContent();
    await page.mouse.up();
    await settle();
    const textAfterRelease = await briefLine.textContent();
    check(
      "a pressed mouse button holds the reveal until it lets go",
      textWhileDown === "plain bold end" && textAfterRelease === briefSource,
      `${textWhileDown}, then ${textAfterRelease}`
    );

    await replaceBrief("plain **bold*");
    const composition = await page.context().newCDPSession(page);
    await composition.send("Input.imeSetComposition", {
      text: "*",
      selectionStart: 1,
      selectionEnd: 1,
    });
    await settle();

    const boldRunsWhileComposing = await briefContent
      .locator(".lmd-strong")
      .count();

    const textWhileComposing = await briefValue.inputValue();
    await composition.send("Input.insertText", { text: "*" });
    await settle();

    const boldRunsAfterComposing = await briefContent
      .locator(".lmd-strong")
      .count();

    check(
      "a composition redraws nothing until it ends",
      textWhileComposing === "plain **bold**" &&
        boldRunsWhileComposing === 0 &&
        boldRunsAfterComposing === 1,
      `${textWhileComposing}, ${boldRunsWhileComposing} bold runs, then ${boldRunsAfterComposing}`
    );

    await replaceBrief("# Heading");
    check(
      "a heading is a styled line, with no heading element in the textbox",
      (await briefContent.locator(".lmd-h1").count()) === 1 &&
        (await briefContent.locator("h1, h2, h3, h4, h5, h6").count()) === 0
    );

    await replaceBrief("- [ ] task");
    await page.keyboard.press("Enter");
    await page.keyboard.press("Enter");
    await page.keyboard.type("next");
    await settle();
    await briefContent.locator(".lmd-check").first().click();
    await settle();
    const textAfterToggle = await briefValue.inputValue();
    check(
      "a rendered task checkbox toggles its source",
      textAfterToggle.startsWith("- [x] task"),
      textAfterToggle
    );

    await page.evaluate(() => {
      document.body.dataset["opened"] = "";
      window.open = (...target) => {
        document.body.dataset["opened"] += `${JSON.stringify(target)}\n`;

        return null;
      };
    });

    const openedLinks = async (): Promise<string> =>
      (await page.locator("body").getAttribute("data-opened")) ?? "";

    await replaceBrief(
      "[site](https://example.com/a) [bad](javascript:alert(1))"
    );
    await page.keyboard.press("ControlOrMeta+Enter");
    await settle();
    const afterScriptLink = await openedLinks();
    await moveCaretHome(2);
    await page.keyboard.press("ControlOrMeta+Enter");
    await settle();

    const expectedOpen = `${JSON.stringify([
      "https://example.com/a",
      "_blank",
      "noopener,noreferrer",
    ])}\n`;

    check(
      "the keyboard opens a safe link at the caret and refuses a script link",
      afterScriptLink === "" && (await openedLinks()) === expectedOpen,
      await openedLinks()
    );

    await briefContent.locator(".lmd-link").first().click();
    await settle();
    const afterPlainClick = await openedLinks();
    await briefContent
      .locator(".lmd-link")
      .first()
      .click({ modifiers: ["ControlOrMeta"] });
    await settle();
    check(
      "a modified click opens a link, and a plain click does not",
      afterPlainClick === expectedOpen &&
        (await openedLinks()) === `${expectedOpen}${expectedOpen}`,
      await openedLinks()
    );

    await page.evaluate(() => {
      document.body.dataset["opened"] = "";
    });
    await replaceBrief("[a](<https://example.com/a b>) <me@example.com>");
    await moveCaretHome(1);
    await page.keyboard.press("ControlOrMeta+Enter");
    await page.keyboard.press("End");
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ControlOrMeta+Enter");
    await settle();
    check(
      "a link in angle brackets opens without them, and an email autolink opens as mailto",
      (await openedLinks()) ===
        `${JSON.stringify(["https://example.com/a%20b", "_blank", "noopener,noreferrer"])}\n${JSON.stringify(["mailto:me@example.com", "_blank", "noopener,noreferrer"])}\n`,
      await openedLinks()
    );

    await replaceBrief("plain text");
    await page.keyboard.press("ControlOrMeta+Enter");
    await settle();
    check(
      "Mod-Enter off a link leaves the text unchanged",
      (await briefValue.inputValue()) === "plain text" &&
        (await briefContent.locator(".cm-line").count()) === 1,
      JSON.stringify(await briefValue.inputValue())
    );

    await replaceBrief("- [ ] one");
    const taskBox = await briefContent.locator(".lmd-check").boundingBox();
    check(
      "a task checkbox is square inside a field, not as wide as the line",
      taskBox !== null && taskBox.width <= taskBox.height + 2,
      JSON.stringify(taskBox)
    );

    await briefContent.locator(".lmd-check").click({ button: "right" });
    await settle();
    const isFocusedAfterRightClick = await isBriefFocused();
    check(
      "a right click on a task checkbox neither toggles it nor takes focus from the editor",
      (await briefValue.inputValue()) === "- [ ] one" &&
        !(await briefContent.locator(".lmd-check").isChecked()) &&
        isFocusedAfterRightClick,
      `${await briefValue.inputValue()}, editor focused ${isFocusedAfterRightClick}`
    );

    await replaceBrief("plain");
    await page.keyboard.press("Enter");
    await page.keyboard.type("- [ ] one");
    await page.keyboard.press("Enter");
    await page.keyboard.type("two");
    await page.keyboard.press("Enter");
    await page.keyboard.press("Enter");
    await page.keyboard.type("end");
    await page.keyboard.press("ControlOrMeta+Home");
    await settle();
    const textBeforeTab = await briefValue.inputValue();

    const checkboxesBeforeTab = await briefContent
      .locator(".lmd-check")
      .count();

    await page.keyboard.press("Tab");
    await settle();

    const focusAfterTab = await page.evaluate(() => ({
      isInEditor:
        document
          .querySelector("#forms form pp-markdown-editor")
          ?.contains(document.activeElement) === true,
      className: document.activeElement?.className ?? "",
    }));

    check(
      "Tab skips a task's checkboxes and leaves the Markdown editor",
      checkboxesBeforeTab === 2 &&
        !focusAfterTab.isInEditor &&
        (await briefValue.inputValue()) === textBeforeTab,
      `${checkboxesBeforeTab} checkboxes, focus on "${focusAfterTab.className}"`
    );

    const imageRequests: Array<{ url: string; referer: string | undefined }> =
      [];

    await page.route("https://images.example/**", async (route) => {
      const headers = await route.request().allHeaders();
      imageRequests.push({
        url: route.request().url(),
        referer: headers["referer"],
      });
      await route.fulfill({
        contentType: "image/png",
        body: Buffer.from(PIXEL_PNG, "base64"),
      });
    });

    const mountStandaloneEditor = async (
      source: string,
      isUrlParseMissing = false
    ): Promise<Locator> => {
      await page.evaluate(
        ([text, isMissing]) => {
          const parse = Object.getOwnPropertyDescriptor(URL, "parse");
          const host = document.createElement("pp-markdown-editor");
          const textarea = document.createElement("textarea");

          host.id = "smoke-editor";
          host.style.cssText =
            "position: fixed; top: 0; left: 0; width: 480px; z-index: 1000; background: var(--paper)";
          textarea.value = text;
          host.append(textarea);
          Object.assign(host, { source: text });

          if (isMissing) {
            Reflect.deleteProperty(URL, "parse");
          }

          try {
            document.body.append(host);
          } finally {
            if (parse !== undefined) {
              Object.defineProperty(URL, "parse", parse);
            }
          }
        },
        [source, isUrlParseMissing] as const
      );

      return page.locator("#smoke-editor");
    };

    const unmountStandaloneEditor = async (): Promise<void> => {
      await page.evaluate(() => {
        document.querySelector("#smoke-editor")?.remove();
      });
      await settle();
    };

    const errorsBeforeMultiLineImage = problems.length;

    const multiLineImage = await mountStandaloneEditor(
      "![two\nlines](https://images.example/two.png)"
    );

    await settle();

    const multiLineImageLines = await multiLineImage
      .locator(".cm-line")
      .allTextContents();

    check(
      "stored text with an image across two lines mounts the editor and shows its text",
      JSON.stringify(multiLineImageLines) ===
        JSON.stringify(["two", "lines"]) &&
        problems.length === errorsBeforeMultiLineImage,
      `${JSON.stringify(multiLineImageLines)} ${problems.slice(errorsBeforeMultiLineImage).join(" | ")}`
    );
    await unmountStandaloneEditor();

    const errorsBeforeFailedMount = problems.length;

    const failedMount = await mountStandaloneEditor(
      "![a](https://images.example/a.png)",
      true
    );

    await settle();
    const failedMountErrors = problems.splice(errorsBeforeFailedMount);
    const fallbackField = failedMount.locator("textarea");
    const fallbackBox = await fallbackField.boundingBox();

    const fallbackOpacity = await fallbackField.evaluate(
      (textarea) => getComputedStyle(textarea).opacity
    );

    await fallbackField.focus();
    await page.keyboard.press("ControlOrMeta+End");
    await page.keyboard.type(" typed");
    check(
      "an editor that fails to mount reports it and leaves a working textarea",
      (await failedMount.locator(".markdown-surface").count()) === 0 &&
        fallbackBox !== null &&
        fallbackBox.width > 100 &&
        fallbackBox.height > 20 &&
        fallbackOpacity === "1" &&
        (await fallbackField.inputValue()) ===
          "![a](https://images.example/a.png) typed" &&
        failedMountErrors.length === 1,
      `box ${JSON.stringify(fallbackBox)}, opacity ${fallbackOpacity}, errors ${failedMountErrors.join(" | ")}`
    );
    await unmountStandaloneEditor();

    const images = await mountStandaloneEditor(
      [
        "![script](javascript:alert(1))",
        `![data](data:image/png;base64,${PIXEL_PNG})`,
        "![file](file:///etc/hosts)",
        "![web](https://images.example/web.png)",
      ].join("\n\n")
    );

    await settle();

    const imageSources = await images
      .locator("img.lmd-img")
      .evaluateAll((elements) =>
        elements.flatMap((element) =>
          element instanceof HTMLImageElement ? [element.src] : []
        )
      );

    check(
      "of four image sources only the https one is requested, with no Referer",
      JSON.stringify(imageSources) ===
        JSON.stringify(["https://images.example/web.png"]) &&
        JSON.stringify(imageRequests) ===
          JSON.stringify([{ url: "https://images.example/web.png" }]),
      `${JSON.stringify(imageSources)} ${JSON.stringify(imageRequests)}`
    );
    await unmountStandaloneEditor();

    const outsideText = "An agent wrote a different sentence here.";
    const undone = await mountStandaloneEditor("");
    await undone.locator(".cm-content").click();
    await page.keyboard.type("mine");
    await settle();
    await page.evaluate((text) => {
      const host = document.querySelector("#smoke-editor");

      if (host !== null) {
        Object.assign(host, { source: text });
      }
    }, outsideText);
    await settle();
    await page.keyboard.press("ControlOrMeta+z");
    await settle();
    const textAfterUndo = await undone.locator(".cm-content").textContent();
    check(
      "undo after an outside change leaves the outside text",
      textAfterUndo === outsideText,
      JSON.stringify(textAfterUndo)
    );
    await unmountStandaloneEditor();
    await page.unroute("https://images.example/**");

    await replaceBrief("- item");
    await sampleForm.getByLabel("Project").fill("Field notes");
    await sampleForm.getByLabel("Hosts").fill("app.example.com");
    await sampleForm.getByLabel("New password").fill("a sample password");
    await sampleForm.getByRole("button", { name: "save" }).click();
    await briefContent.click({ force: true });
    const readOnlyDuringSave = await briefContent.getAttribute("aria-readonly");
    await page.keyboard.press("Enter");
    await page.keyboard.type("x");
    await settle();
    const linesDuringSave = await briefContent.locator(".cm-line").count();
    check(
      "the Markdown editor refuses Enter and typing while read-only",
      readOnlyDuringSave === "true" &&
        linesDuringSave === 1 &&
        (await briefValue.inputValue()) === "- item",
      `aria-readonly ${readOnlyDuringSave}, ${linesDuringSave} lines`
    );

    const buttonsFoot = page.locator("#buttons .spec-foot");
    await buttonsFoot.locator(".disclosure-summary").click();
    await settle();
    check(
      "a section's markup opens under its source",
      (
        (await buttonsFoot
          .getByRole("group", { name: "Buttons, the markup" })
          .textContent()) ?? ""
      )
        .trimStart()
        .startsWith("<div")
    );

    const reelOffSlot = async (): Promise<readonly string[]> =>
      await page.evaluate(() =>
        [...document.querySelectorAll("[data-reel]")].flatMap((reel) =>
          [...reel.querySelectorAll("[data-reel-slot]")].flatMap((slot) => {
            const reelHook =
              reel instanceof HTMLElement ? reel.dataset["reel"] : undefined;

            const paneId =
              slot instanceof HTMLElement
                ? slot.dataset["reelSlot"]
                : undefined;

            if (reelHook === undefined || paneId === undefined) {
              throw new Error("A reel or a slot lost its hook.");
            }

            const pane = reel.querySelector(
              `[data-reel-pane="${reelHook}/pane/${paneId}"]`
            );

            const slotBox = slot.getBoundingClientRect();
            const paneBox = pane?.getBoundingClientRect();

            const isOn =
              paneBox !== undefined &&
              (["left", "top", "width", "height"] as const).every(
                (side) => Math.abs(slotBox[side] - paneBox[side]) < 1
              );

            return isOn ? [] : [paneId];
          })
        )
      );

    const shellPane = page.locator('[data-reel-pane="sample-reel/pane/shell"]');
    await page.locator("#reel").scrollIntoViewIfNeeded();
    const offSlot = await reelOffSlot();
    check(
      "every reel pane is drawn on its slot",
      offSlot.length === 0,
      offSlot.join(", ")
    );
    await shellPane.evaluate((pane) =>
      Object.assign(pane, { smokeKept: true })
    );
    await shellPane.locator(".window-body").click();
    await page.keyboard.press("Meta+Alt+Shift+KeyL");
    await settle();
    const movedOffSlot = await reelOffSlot();
    check(
      "a keyboard move puts the pane in the next column and keeps its element",
      (await page
        .locator(
          '[data-reel="sample-reel"] [data-reel-column="review"] [data-reel-slot="shell"]'
        )
        .count()) === 1 &&
        (await shellPane.evaluate(
          (pane) => "smokeKept" in pane && pane.smokeKept === true
        )) &&
        movedOffSlot.length === 0,
      movedOffSlot.join(", ")
    );
    const paperView = page.locator('[data-reel="sample-reel"] > .reel-view');

    const resetReel = async (): Promise<void> => {
      await page
        .locator("#reel button", { hasText: "reset the layout" })
        .click();
      await settle();
      await paperView.evaluate((view) => {
        view.scrollTo(0, 0);
      });
      await paperView.scrollIntoViewIfNeeded();
    };

    await resetReel();

    const notesPane = page.locator('[data-reel-pane="sample-reel/pane/notes"]');
    await notesPane.evaluate((pane) =>
      Object.assign(pane, { smokeKept: true })
    );
    const notesGrip = await notesPane.locator("[data-reel-grip]").boundingBox();

    const diffSlot = await page
      .locator('[data-reel="sample-reel"] [data-reel-slot="diff"]')
      .boundingBox();

    if (notesGrip !== null && diffSlot !== null) {
      await page.mouse.move(
        notesGrip.x + notesGrip.width / 2,
        notesGrip.y + notesGrip.height / 2
      );
      await page.mouse.down();
      await page.waitForTimeout(SETTLE);
      await page.mouse.move(
        diffSlot.x + diffSlot.width / 2,
        diffSlot.y + diffSlot.height * 0.8,
        {
          steps: 10,
        }
      );
      await page.mouse.up();
      await settle();
    }

    const draggedOffSlot = await reelOffSlot();

    const reviewSlots = await page
      .locator(
        '[data-reel="sample-reel"] [data-reel-column="review"] [data-reel-slot]'
      )
      .evaluateAll((slots) => slots.map((slot) => slot.dataset["reelSlot"]));

    check(
      "a pointer drags a pane into another column and keeps its element",
      reviewSlots.includes("notes") &&
        (await notesPane.evaluate(
          (pane) => "smokeKept" in pane && pane.smokeKept === true
        )) &&
        draggedOffSlot.length === 0,
      `review: ${reviewSlots.join(", ")}; off slot: ${draggedOffSlot.join(", ")}`
    );
    await resetReel();

    const workColumn = page.locator(
      '[data-reel="sample-reel"] [data-reel-column="work"]'
    );

    const widthBefore = numberIn(
      "The work column's --reel-width",
      await workColumn.evaluate((column) =>
        column.style.getPropertyValue("--reel-width")
      ),
      ""
    );

    const splitter = await page
      .locator('[data-reel="sample-reel"] [data-reel-resize="work"]')
      .boundingBox();

    if (splitter !== null) {
      await page.mouse.move(
        splitter.x + splitter.width / 2,
        splitter.y + splitter.height / 2
      );
      await page.mouse.down();
      await page.waitForTimeout(SETTLE);
      await page.mouse.move(
        splitter.x + splitter.width / 2 + 80,
        splitter.y + splitter.height / 2,
        {
          steps: 5,
        }
      );
      await page.mouse.up();
      await settle();
    }

    const widthAfter = numberIn(
      "The work column's --reel-width",
      await workColumn.evaluate((column) =>
        column.style.getPropertyValue("--reel-width")
      ),
      ""
    );

    check(
      "a splitter dragged right widens its column",
      widthAfter > widthBefore,
      `${widthBefore} to ${widthAfter}`
    );
    await resetReel();

    for (const paneId of ["diff", "canvas"]) {
      await page
        .locator(`[data-reel-pane="sample-reel/pane/${paneId}"] .window-body`)
        .click();
      await page.keyboard.press("Meta+Alt+Shift+KeyH");
      await settle();
    }

    for (const _ of Array.from({ length: 3 })) {
      await page.keyboard.press("Meta+Alt+KeyJ");
      await settle();
    }

    const followed = await paperView.evaluate((view) => {
      const slots = view.querySelectorAll(
        '[data-reel-column="work"] [data-reel-slot]'
      );

      const last = slots.item(slots.length - 1).getBoundingClientRect();

      return {
        panes: slots.length,
        scrollTop: view.scrollTop,
        isInView: last.bottom <= view.getBoundingClientRect().bottom + 1,
      };
    });

    check(
      "focus followed down a column taller than the reel scrolls its last pane into view",
      followed.panes >= 4 && followed.scrollTop > 0 && followed.isInView,
      JSON.stringify(followed)
    );
    await resetReel();

    await page
      .locator('[data-reel-pane="sample-reel/pane/diff"] .window-body')
      .click();
    await page
      .locator('[data-reel-pane="sample-reel/pane/diff"]')
      .getByRole("button", { name: "Close" })
      .press("Enter");
    await settle();

    const afterClose = await page.evaluate(
      () =>
        document.activeElement?.closest<HTMLElement>("[data-reel-pane]")
          ?.dataset["reelPane"] ?? ""
    );

    check(
      "closing the focused pane puts the keyboard in its neighbour",
      afterClose === "sample-reel/pane/canvas",
      afterClose
    );
    await resetReel();

    await page.goto(`${base}${componentsRouter()}`);
    await page.waitForTimeout(HYDRATE);
    const sampleRail = page.locator("#sample-rail");
    await sampleRail.scrollIntoViewIfNeeded();

    const pinned = await sampleRail.evaluate((rail) => {
      const topOf = (selector: string): number =>
        rail.querySelector(selector)?.getBoundingClientRect().top ?? Number.NaN;

      const list = rail.querySelector(".panel:last-child > nav");

      const before = [
        topOf(".panel-tb"),
        topOf(".panel-shelf"),
        topOf(".panel-foot"),
      ];

      if (list !== null) {
        list.scrollTop = list.scrollHeight;
      }

      const after = [
        topOf(".panel-tb"),
        topOf(".panel-shelf"),
        topOf(".panel-foot"),
      ];

      const footBottom =
        rail.querySelector(".panel-foot")?.getBoundingClientRect().bottom ??
        Number.POSITIVE_INFINITY;

      return {
        isListScrolled: (list?.scrollTop ?? 0) > 0,
        isRailStill: rail.scrollTop === 0,
        isTopStill: before.every((top, index) => top === after[index]),
        isFootShown: footBottom <= rail.getBoundingClientRect().bottom,
      };
    });

    check(
      "a rail's list scrolls under its pinned bar and shelf, its foot in view",
      pinned.isListScrolled &&
        pinned.isRailStill &&
        pinned.isTopStill &&
        pinned.isFootShown,
      JSON.stringify(pinned)
    );

    const railStep = await sampleRail.evaluate(
      (rail) => getComputedStyle(rail).transitionTimingFunction
    );

    await page.getByRole("button", { name: "Hide collections" }).click();
    await settle();

    const folded = await sampleRail.evaluate((rail) => {
      const bar = rail.querySelector(".rail-head + .panel > .panel-tb");

      const hidden = [
        ...rail.querySelectorAll(".panel-shelf, nav, .panel-foot"),
      ];

      return {
        width: rail.getBoundingClientRect().width,
        strip: getComputedStyle(document.documentElement).getPropertyValue(
          "--rail-folded"
        ),
        hasSplitter:
          rail.closest(".railed")?.querySelector(".rail-resize") !== null,
        writing: bar === null ? "" : getComputedStyle(bar).writingMode,
        isRestGone:
          hidden.length > 0 &&
          hidden.every((part) => part.getClientRects().length === 0),
        focus: document.activeElement?.getAttribute("aria-label") ?? "",
      };
    });

    const foldedStrip = numberIn("--rail-folded", folded.strip, "px");

    check(
      "the rail's toggle folds it to its bar on end, the strip's width, without its splitter",
      Math.abs(folded.width - foldedStrip) < 1 &&
        !folded.hasSplitter &&
        folded.writing === "vertical-rl" &&
        folded.isRestGone &&
        folded.focus === "Show collections" &&
        railStep.startsWith("steps(3"),
      `${JSON.stringify(folded)} ${railStep}`
    );
    await page.keyboard.press("Tab");

    const isFocusOutOfRail = await sampleRail.evaluate(
      (rail) => !rail.contains(document.activeElement)
    );

    check(
      "a folded rail keeps nothing past its toggle in the tab order",
      isFocusOutOfRail
    );
    const showToggle = page.getByRole("button", { name: "Show collections" });
    await showToggle.hover();
    await page.waitForTimeout(SETTLE + 400);

    const foldedTip = await page.evaluate(() => {
      const found = document.querySelector(".tip");
      const tip = found instanceof HTMLElement ? found : null;

      const toggle = document
        .querySelector("#sample-rail-toggle")
        ?.getBoundingClientRect();

      const box = tip?.getBoundingClientRect();

      return {
        text: tip?.textContent ?? "",
        side: tip?.dataset["side"] ?? "",
        isBeside:
          box !== undefined && toggle !== undefined && box.left >= toggle.right,
      };
    });

    check(
      "a folded rail's toggle says its words in a tip beside the bar",
      foldedTip.text === "Show collections" &&
        foldedTip.side === "right" &&
        foldedTip.isBeside,
      JSON.stringify(foldedTip)
    );
    await showToggle.click();
    await settle();

    const unfolded = await sampleRail.evaluate((rail) => ({
      width: rail.getBoundingClientRect().width,
      hasSplitter:
        rail.closest(".railed")?.querySelector(".rail-resize") !== null,
      focus: document.activeElement?.getAttribute("aria-label") ?? "",
    }));

    check(
      "the toggle unfolds the rail to its width and splitter, focus kept on it",
      unfolded.hasSplitter &&
        unfolded.width > folded.width &&
        unfolded.focus === "Hide collections",
      JSON.stringify(unfolded)
    );

    await page.goto(`${base}${screenUrl("workspace")}`);
    await page.waitForTimeout(HYDRATE);
    await page.getByRole("button", { name: "Hide Tasks" }).click();
    await settle();

    const benchBeside = await page.evaluate(() => ({
      bench:
        document.querySelector(".bench")?.getBoundingClientRect().left ??
        Number.NaN,
      strip: getComputedStyle(document.documentElement).getPropertyValue(
        "--rail-folded"
      ),
    }));

    check(
      "a bench beside a folded rail starts at the strip's edge",
      Math.abs(
        benchBeside.bench - numberIn("--rail-folded", benchBeside.strip, "px")
      ) < 1,
      JSON.stringify(benchBeside)
    );
    const wide = page.viewportSize();
    await page.setViewportSize({ width: 800, height: 720 });
    await settle();
    await page.locator(".rail-open button").click();
    await settle();

    const drawer = await page.evaluate(() => {
      const rail = document.querySelector(".rail");
      const bar = rail?.querySelector(".panel-tb");

      return {
        isOpen: rail?.matches(":popover-open") ?? false,
        isToggleShown:
          (rail?.querySelector(".rail-toggle button")?.getClientRects()
            .length ?? 0) > 0,
        isListShown:
          (rail?.querySelector(".rows")?.getClientRects().length ?? 0) > 0,
        barPadding:
          bar === null || bar === undefined
            ? ""
            : getComputedStyle(bar).paddingLeft,
      };
    });

    check(
      "a hidden rail's drawer opens whole at 900px and under, with no toggle",
      drawer.isOpen &&
        !drawer.isToggleShown &&
        drawer.isListShown &&
        drawer.barPadding === "12px",
      JSON.stringify(drawer)
    );
    await page.keyboard.press("Escape");

    if (wide !== null) {
      await page.setViewportSize(wide);
    }

    const veiledAt = async (frame: string): Promise<readonly string[]> =>
      await page.evaluate((frameSelector) => {
        for (const element of document.querySelectorAll<HTMLElement>(
          "[inert]"
        )) {
          element.inert = false;
        }

        const covered = [
          ".rail",
          ".rail-resize",
          ".topbar",
          ".statusbar",
        ].filter((selector) => document.querySelector(selector) !== null);

        return covered.flatMap((selector) => {
          const box = document.querySelector(selector)?.getBoundingClientRect();

          const hit =
            box === undefined
              ? null
              : document.elementFromPoint(
                  box.left + box.width / 2,
                  box.top + box.height / 2
                );

          const dialog = hit === null ? null : hit.closest("dialog[open]");

          const isVeiled =
            dialog !== null && dialog.closest(frameSelector) !== null;

          return isVeiled ? [] : [selector];
        });
      }, frame);

    await page.goto(`${base}${screenUrl("workspace")}`);
    await page.waitForTimeout(HYDRATE);
    await page.getByRole("button", { name: "stop", exact: true }).click();
    await page.getByRole("alertdialog", { name: "Stop" }).waitFor();
    const benchUnveiled = await veiledAt(".bench");
    check(
      "a dialog in a railed bench is drawn over the rail, its splitter and the bars",
      benchUnveiled.length === 0,
      `drawn over the veil: ${benchUnveiled.join(", ")}`
    );

    await page.goto(`${base}${screenUrl("stage")}`);
    await page.waitForTimeout(HYDRATE);
    await page.getByRole("button", { name: "start", exact: true }).click();
    await page.getByRole("button", { name: "stop", exact: true }).click();
    await page.getByRole("dialog", { name: "Stop" }).waitFor();
    const stageUnveiled = await veiledAt(".stage");
    check(
      "a dialog on a stage is drawn over the bars",
      stageUnveiled.length === 0,
      `drawn over the veil: ${stageUnveiled.join(", ")}`
    );

    const benchSizes = async (): Promise<
      Readonly<{
        work: number;
        isHeadScrolling: boolean;
        isHeadEndReached: boolean;
      }>
    > =>
      await page.evaluate(() => {
        const head = document.querySelector(".bench-head");

        const work = document
          .querySelector(".bench-work")
          ?.getBoundingClientRect();

        if (head === null || work === undefined) {
          return { work: 0, isHeadScrolling: false, isHeadEndReached: false };
        }

        head.scrollTop = head.scrollHeight;
        const last = head.lastElementChild?.getBoundingClientRect();

        return {
          work: work.height,
          isHeadScrolling: head.scrollHeight > head.clientHeight,
          isHeadEndReached: last !== undefined && last.bottom <= work.top + 1,
        };
      });

    const tall = page.viewportSize();
    await page.goto(`${base}${screenUrl("workspace")}`);
    await page.waitForTimeout(HYDRATE);

    const floor = numberIn(
      "--bench-work-min",
      await page.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue(
          "--bench-work-min"
        )
      ),
      "px"
    );

    const atRest = await benchSizes();
    check(
      "a bench's head takes its own height where the window has room",
      !atRest.isHeadScrolling && atRest.work > floor,
      JSON.stringify(atRest)
    );
    await page.setViewportSize({ width: 844, height: 390 });
    await settle();
    const squeezed = await benchSizes();
    check(
      "on a short window a bench's work keeps its floor and its head scrolls to its end",
      Math.abs(squeezed.work - floor) < 1 &&
        squeezed.isHeadScrolling &&
        squeezed.isHeadEndReached,
      JSON.stringify(squeezed)
    );

    const headFloor = numberIn(
      "--bench-head-min",
      await page.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue(
          "--bench-head-min"
        )
      ),
      "px"
    );

    await page.setViewportSize({ width: 800, height: 280 });
    await settle();

    const crowded = await page.evaluate(() => {
      const bench = document.querySelector(".bench")?.getBoundingClientRect();

      const work = document
        .querySelector(".bench-work")
        ?.getBoundingClientRect();

      const head = document.querySelector(".bench-head");

      if (head !== null) {
        head.scrollTop = 0;
      }

      const open = document
        .querySelector(".rail-open button")
        ?.getBoundingClientRect();

      const headBox = head?.getBoundingClientRect();

      return {
        bench: bench?.height ?? 0,
        work: work?.height ?? 0,
        isOpenShown:
          open !== undefined &&
          headBox !== undefined &&
          open.bottom <= headBox.bottom,
      };
    });

    check(
      "on a window too short for both, a bench's head keeps the rail's button and the work the rest",
      Math.abs(crowded.work - (crowded.bench - headFloor)) < 1 &&
        crowded.isOpenShown,
      JSON.stringify(crowded)
    );

    if (tall !== null) {
      await page.setViewportSize(tall);
    }

    await page.locator(".topbar button", { hasText: "plum" }).click();
    await settle();
    check(
      "plum pins data-scheme",
      (await html.getAttribute("data-scheme")) === "dark"
    );
    await page.reload();
    await page.waitForTimeout(HYDRATE);
    check(
      "the palette is remembered across a reload",
      (await html.getAttribute("data-scheme")) === "dark" &&
        (await page
          .locator('.topbar button[aria-pressed="true"]')
          .textContent()) === "plum"
    );
    await page.locator(".topbar button", { hasText: "system" }).click();
    await settle();
    check(
      "system lets go of data-scheme",
      (await html.getAttribute("data-scheme")) === null
    );
    await page.reload();
    await page.waitForTimeout(HYDRATE);
    check(
      "and stays let go after a reload",
      (await html.getAttribute("data-scheme")) === null &&
        (await page
          .locator('.topbar button[aria-pressed="true"]')
          .textContent()) === "system"
    );

    check(
      "no page errors or console errors",
      problems.length === 0,
      problems.join(" | ")
    );
  } finally {
    await browser.close();
  }
} catch (error) {
  check(
    "the smoke ran to its end",
    false,
    error instanceof Error ? error.message : String(error)
  );
} finally {
  if (server.pid !== undefined) {
    process.kill(-server.pid, "SIGTERM");
  }
}

for (const { name, isPass, detail } of results) {
  console.log(
    `${isPass ? "PASS" : "FAIL"} ${name}${detail === "" ? "" : ` (${detail})`}`
  );
}

const failures = results.filter(({ isPass }) => !isPass).length;

console.log(`${results.length - failures} passed, ${failures} failed`);

process.exitCode = failures === 0 ? 0 : 1;
