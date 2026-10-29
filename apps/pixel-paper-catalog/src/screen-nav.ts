import { Menu, NavStrip } from "@gjermundgaraba/pixel-paper";
import { Array } from "effect";
import type { Html, HtmlBuilder } from "foldkit/html";

import { screenUrl } from "./route.ts";
import * as Screens from "./screen/screens.ts";
import { Slug } from "./screen/slugs.ts";

export type ViewConfig<ParentMessage> = Readonly<{
  menu: Menu.Model;
  current: Slug;
  toParentMessage: (message: Menu.Message) => ParentMessage;
}>;

const isWall = (screen: Slug): boolean =>
  Screens.catalog[screen].layout === "Wall";

const working = Array.filter(Slug.literals, (screen) => !isWall(screen));
const walls = Array.filter(Slug.literals, isWall);

export const menuView = <ParentMessage>(
  config: ViewConfig<ParentMessage>,
  h: HtmlBuilder<ParentMessage>
): Html =>
  h.submodel({
    slotId: Menu.id(config.menu),
    model: config.menu,
    view: Menu.view,
    viewInputs: {
      label: `screen · ${config.current}`,
      items: Array.map([...working, ...walls], (screen) =>
        Menu.link({
          id: screen,
          label: isWall(screen) ? `${screen} wall` : screen,
          href: screenUrl(screen),
        })
      ),
    },
    toParentMessage: config.toParentMessage,
  });

const stripView = <ParentMessage>(
  label: string,
  screens: readonly Slug[],
  current: Slug,
  h: HtmlBuilder<ParentMessage>
): Html =>
  NavStrip.view(
    {
      label,
      items: Array.map(screens, (screen) => ({
        href: screenUrl(screen),
        label: screen,
        isCurrent: screen === current,
      })),
    },
    h
  );

export const view = <ParentMessage>(
  config: ViewConfig<ParentMessage>,
  h: HtmlBuilder<ParentMessage>
): Html =>
  h.div(
    [h.Class("spec-sub")],
    [
      h.span(
        [h.Class("spec-screens-strip")],
        [
          stripView("Screens", working, config.current, h),
          h.span([h.Class("spec-caption")], ["walls, one card on the ground:"]),
          stripView("Walls", walls, config.current, h),
        ]
      ),
      h.span([h.Class("spec-screens-menu")], [menuView(config, h)]),
      h.span(
        [h.Class("spec-caption")],
        [Screens.catalog[config.current].description]
      ),
    ]
  );
