import {
  CommandPalette,
  KeyHelp,
  LiveRegion,
} from "@gjermundgaraba/pixel-paper";
import { Option } from "effect";
import type { Html, HtmlBuilder } from "foldkit/html";

import * as DialogsExample from "./example/dialogs.ts";
import { Message } from "./message.ts";
import type { Model } from "./model.ts";
import { AppRoute, maybeScreenOf } from "./route.ts";
import * as Screens from "./screen/screens.ts";
import * as CommandExamples from "./section/commands.ts";

type LiveRegionHost =
  | "KeyHelp"
  | "Palette"
  | "DialogsExample"
  | "CommandExamples"
  | "Screen";

export const liveRegionPlacement = (
  model: Model,
  h: HtmlBuilder<Message>
): LiveRegion.Placement<LiveRegionHost> => {
  const isComponents = AppRoute.isAnyOf(["Components"])(model.route);

  return LiveRegion.place<LiveRegionHost>(
    [
      [
        "Screen",
        Option.exists(maybeScreenOf(model.route), (screen) =>
          Screens.isDialogOpen(model.screens, screen)
        ),
      ],
      [
        "CommandExamples",
        isComponents && CommandExamples.isDialogOpen(model.commands),
      ],
      [
        "DialogsExample",
        isComponents && DialogsExample.isDialogOpen(model.dialogs),
      ],
      ["Palette", CommandPalette.isOpen(model.palette)],
      ["KeyHelp", KeyHelp.isOpen(model.keyHelp)],
    ],
    () =>
      LiveRegion.view(
        {
          toasts: CommandExamples.toastsView(
            model.commands,
            (message) => Message.GotCommandExamplesMessage({ message }),
            h
          ),
        },
        h
      )
  );
};

export const liveRegionIn = (
  model: Model,
  host: LiveRegionHost,
  h: HtmlBuilder<Message>
): (() => Html) | undefined => liveRegionPlacement(model, h).toDialogView(host);
