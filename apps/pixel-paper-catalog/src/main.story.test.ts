import { Dialog as UiDialog } from "@foldkit/ui";
import {
  CommandPalette,
  CopyButton,
  KeyHelp,
  Scheme,
  SkipLink,
} from "@gjermundgaraba/pixel-paper";
import { Array, Option, Order } from "effect";
import { Story } from "foldkit";
import { UrlRequest } from "foldkit/navigation";
import { fromString } from "foldkit/url";
import { describe, expect, it } from "vite-plus/test";

import type { CopyKey } from "./copies.ts";
import { LoadExternal, NavigateInternal, init, update } from "./main.ts";
import { Message, toCopyMessage } from "./message.ts";
import { AppRoute } from "./route.ts";

const url = Option.getOrThrow(fromString("https://example.com/"));
const { model } = init(url);

const resolveShow = Story.Command.resolve(
  UiDialog.ShowDialog,
  UiDialog.Message.SucceededShowDialog()
);

const resolveClose = Story.Command.resolve(
  UiDialog.CloseDialog,
  UiDialog.Message.CompletedCloseDialog()
);

const pickPaletteCommand = (id: string) =>
  Message.GotPaletteMessage({
    message: CommandPalette.Message.ClickedRow({
      row: { id, isHeld: false, hasPage: false },
      maybeShownPage: Option.none(),
    }),
  });

const toUrl = (href: string) => Option.getOrThrow(fromString(href));

describe("links", () => {
  it("follows a link on this site itself", () => {
    Story.story(
      update,
      Story.given(model),
      Story.message(
        Message.ClickedLink({
          request: UrlRequest.Internal({
            url: toUrl("https://example.com/components#buttons"),
          }),
        })
      ),
      Story.Command.expectExact(
        NavigateInternal({ url: "https://example.com/components#buttons" })
      ),
      Story.Command.resolve(
        NavigateInternal,
        Message.CompletedNavigateInternal()
      )
    );
  });

  it("hands a link to another site to the browser", () => {
    Story.story(
      update,
      Story.given(model),
      Story.message(
        Message.ClickedLink({
          request: UrlRequest.External({ href: "https://example.org/" }),
        })
      ),
      Story.Command.expectExact(LoadExternal({ href: "https://example.org/" })),
      Story.Command.resolve(LoadExternal, Message.CompletedLoadExternal())
    );
  });

  it("shows the page a new address names, at its fragment", () => {
    Story.story(
      update,
      Story.given(model),
      Story.message(
        Message.ChangedUrl({
          url: toUrl("https://example.com/components#buttons"),
        })
      ),
      Story.Command.expectExact(
        SkipLink.ScrollToFragment({ maybeFragment: Option.some("buttons") })
      ),
      Story.Command.resolve(
        SkipLink.ScrollToFragment,
        Message.CompletedScrollToFragment()
      ),
      Story.model((next) => {
        expect(next.route).toStrictEqual(AppRoute.Components());
      })
    );
  });
});

describe("the palette's commands", () => {
  it("goes to the page a command names", () => {
    Story.story(
      update,
      Story.given(model),
      Story.message(Message.PressedPaletteKey()),
      resolveShow,
      Story.message(pickPaletteCommand("go-components")),
      Story.Command.expectHas(NavigateInternal({ url: "/components" })),
      resolveClose,
      Story.Command.resolve(
        NavigateInternal,
        Message.CompletedNavigateInternal()
      ),
      Story.model((next) => {
        expect(CommandPalette.isOpen(next.palette)).toBe(false);
      })
    );
  });

  it("pins the palette a command names", () => {
    Story.story(
      update,
      Story.given(model),
      Story.message(Message.PressedPaletteKey()),
      resolveShow,
      Story.message(pickPaletteCommand("scheme-Plum")),
      Story.Command.expectHas(
        Scheme.SchemeSwitch.PinScheme({ scheme: "Plum" })
      ),
      resolveClose,
      Story.Command.resolve(
        Scheme.SchemeSwitch.PinScheme,
        Scheme.SchemeSwitch.Message.CompletedPinScheme()
      )
    );
  });

  it("opens the key help", () => {
    Story.story(
      update,
      Story.given(model),
      Story.message(Message.PressedPaletteKey()),
      resolveShow,
      Story.message(pickPaletteCommand("keys")),
      resolveClose,
      resolveShow,
      Story.model((next) => {
        expect(KeyHelp.isOpen(next.keyHelp)).toBe(true);
      })
    );
  });
});

const copy = (key: CopyKey) =>
  toCopyMessage(key, CopyButton.Message.ClickedCopy({ text: "sample" }));

describe("a Copy button that copied", () => {
  const copiedSteps = [
    Story.Command.resolve(
      CopyButton.CopyText,
      CopyButton.Message.SucceededCopyText()
    ),
    Story.Command.resolve(
      CopyButton.AnnounceCopy,
      CopyButton.Message.CompletedAnnounceCopy()
    ),
    Story.Command.resolve(
      CopyButton.WaitBeforeResettingWord,
      CopyButton.Message.CompletedWaitBeforeResettingWord()
    ),
  ];

  it("tells the console its secret was copied", () => {
    Story.story(
      update,
      Story.given(model),
      Story.message(copy("console-secret")),
      ...copiedSteps,
      Story.model((next) => {
        expect(next.screens.console.isSecretStored).toBe(true);
      })
    );
  });

  it("leaves the console's secret alone when another button copies", () => {
    Story.story(
      update,
      Story.given(model),
      Story.message(copy("console-issuer")),
      ...copiedSteps,
      Story.model((next) => {
        expect(next.screens.console.isSecretStored).toBe(false);
      })
    );
  });
});

describe("the markup disclosures", () => {
  it("keeps each section's open or shut, one entry per open section", () => {
    Story.story(
      update,
      Story.given(model),
      Story.message(
        Message.ToggledMarkup({ sectionId: "buttons", isOpen: true })
      ),
      Story.message(
        Message.ToggledMarkup({ sectionId: "forms", isOpen: true })
      ),
      Story.message(
        Message.ToggledMarkup({ sectionId: "buttons", isOpen: true })
      ),
      Story.model((next) => {
        expect(Array.sort(next.markupShown, Order.String)).toStrictEqual([
          "buttons",
          "forms",
        ]);
      }),
      Story.message(
        Message.ToggledMarkup({ sectionId: "forms", isOpen: false })
      ),
      Story.model((next) => {
        expect(next.markupShown).toStrictEqual(["buttons"]);
      })
    );
  });
});
