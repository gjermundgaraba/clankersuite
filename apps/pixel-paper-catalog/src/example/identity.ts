import { Identity, Wordmark } from "@gjermundgaraba/pixel-paper";
import type { Html, HtmlBuilder } from "foldkit/html";

import { rowView, specView } from "../spec.ts";

// SAMPLE

const SAMPLE_MARK = `
  .......##.......
  .......##.......
  ......####......
  ......####......
  .....##..##.....
  .##.##....##.##.
  ..####....####..
  ####...##...####
  ####...##...####
  ..####....####..
  .##.##....##.##.
  .....##..##.....
  ......####......
  ......####......
  .......##.......
  .......##.......
`;

export const view = <Message>(h: HtmlBuilder<Message>): Html =>
  rowView(
    [
      specView(
        "an identity: its monogram, its name, a meta line",
        [
          Identity.view(
            { label: "Sam Rivera (sample)", meta: ["client 4f2a"] },
            h
          ),
        ],
        h
      ),
      specView(
        "large, as a card's subject",
        [
          Identity.view(
            {
              label: "Northwind Traders (sample)",
              letters: "NW",
              meta: ["provider"],
              isLarge: true,
            },
            h
          ),
        ],
        h
      ),
      specView(
        "a mark the product draws in cells, in place of the letters",
        [
          Identity.view(
            {
              label: "Northwind Traders (sample)",
              drawing: SAMPLE_MARK,
              meta: ["provider"],
              isLarge: true,
            },
            h
          ),
        ],
        h
      ),
      specView(
        "a wordmark: the cursor blinks four times",
        [Wordmark.view({ label: "pixel paper" }, h)],
        h
      ),
    ],
    h
  );
