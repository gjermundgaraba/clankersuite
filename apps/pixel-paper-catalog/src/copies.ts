import { CopyButton } from "@gjermundgaraba/pixel-paper";
import type { Html } from "foldkit/html";

import { defineCopies } from "./define-copies.ts";

export const Copies = defineCopies(
  [
    "console-secret",
    "console-issuer",
    "console-keys",
    "library-path",
    "consent-return",
    "consent-resource",
    "refused-error",
    "refused-asked",
    "not-found-address",
    "files-link",
  ],
  {
    Model: CopyButton.Model,
    Message: CopyButton.Message,
    init: CopyButton.init,
    update: CopyButton.update,
    embed: (copy, viewInputs: CopyButton.ViewInputs, toParentMessage, h) =>
      h.submodel({
        slotId: CopyButton.id(copy),
        model: copy,
        view: CopyButton.view,
        viewInputs,
        toParentMessage,
      }),
  }
);

export type CopyKey = typeof Copies.Key.Type;

export type CopiesModel = typeof Copies.Model.Type;

export type CopyView = (
  key: CopyKey,
  viewInputs: CopyButton.ViewInputs
) => Html;
