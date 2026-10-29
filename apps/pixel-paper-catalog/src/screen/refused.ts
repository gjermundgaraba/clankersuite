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
import { ASKING } from "../sample.ts";
import { brandView } from "../spec.ts";

const ASKED = "https://files.example.test/";
const ERROR = "invalid_target";

const refusalView = <ParentMessage>(
  toCopyView: CopyView,
  h: HtmlBuilder<ParentMessage>
): Html =>
  PropsList.view(
    {
      items: [
        {
          label: "error",
          value: [ERROR],
          isCode: true,
          actions: [
            toCopyView("refused-error", { text: ERROR, label: "Copy error" }),
          ],
        },
        { label: "client", value: [ASKING.name] },
        {
          label: "asked for",
          value: [ASKED],
          isCode: true,
          actions: [
            toCopyView("refused-asked", {
              text: ASKED,
              label: "Copy asked for",
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
      title: "Authorization",
      meta: "refused",
      isNarrow: true,
      actions: [
        LinkButton.view(
          {
            label: `back to ${ASKING.name.toLowerCase()}`,
            href: screenUrl("consent"),
            variant: "Primary",
            isDefault: true,
          },
          h
        ),
      ],
      body: [
        Wall.markView({ brand: brandView(h) }, h),
        Outcome.view(
          {
            tone: "Error",
            title: "Request refused",
            body: [
              `${ASKING.name} asked for a resource this service does not serve, so nothing was granted. Tell whoever runs ${ASKING.name} which address it should ask for.`,
            ],
            detail: [refusalView(toCopyView, h)],
          },
          h
        ),
        Notice.view(
          {
            tone: "Quiet",
            body: [
              "Sample refusal: no client asked, and nothing is sent anywhere.",
            ],
          },
          h
        ),
      ],
    },
    h
  );
