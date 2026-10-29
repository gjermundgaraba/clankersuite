import {
  Card,
  LinkButton,
  Notice,
  Outcome,
  PropsList,
  Wall,
} from "@gjermundgaraba/pixel-paper";
import type { Html, HtmlBuilder } from "foldkit/html";

import type { CopyView } from "../copies.ts";
import { screenUrl } from "../route.ts";
import { brandView } from "../spec.ts";

const ASKED = "/spaces/quarterly-review";

const addressView = <ParentMessage>(
  toCopyView: CopyView,
  h: HtmlBuilder<ParentMessage>
): Html =>
  PropsList.view(
    {
      items: [
        {
          label: "address",
          value: [ASKED],
          isCode: true,
          actions: [
            toCopyView("not-found-address", {
              text: ASKED,
              label: "Copy address",
            }),
          ],
        },
      ],
    },
    h
  );

export const view = <ParentMessage>(
  toCopyView: CopyView,
  h: HtmlBuilder<ParentMessage>
): Html =>
  Card.view(
    {
      title: "Not found",
      meta: "404",
      isNarrow: true,
      actions: [
        LinkButton.view(
          {
            label: "back to spaces",
            href: screenUrl("spaces"),
            variant: "Primary",
            isDefault: true,
          },
          h
        ),
      ],
      body: [
        Wall.markView({ brand: brandView(h), glyph: "home" }, h),
        Outcome.view(
          {
            tone: "Error",
            glyph: "question",
            title: "No page here",
            body: [
              "Nothing lives at this address. The space it named may have been removed, or the link was copied wrong.",
            ],
            detail: [addressView(toCopyView, h)],
          },
          h
        ),
        Notice.view(
          {
            tone: "Quiet",
            body: ["Sample page: the address was made up for the specimen."],
          },
          h
        ),
      ],
    },
    h
  );
