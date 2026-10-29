import {
  Button,
  Chip,
  Crumbs,
  Group,
  PageHead,
  Panel,
  Stack,
  Wrap,
} from "@gjermundgaraba/pixel-paper";
import type { Html, HtmlBuilder } from "foldkit/html";

import { rowView, specView } from "../spec.ts";

const box = <Message>(label: string, h: HtmlBuilder<Message>): Html =>
  h.span([h.Class("spec-box")], [label]);

export const view = <Message>(h: HtmlBuilder<Message>): Html =>
  h.div(
    [h.Class("spec-rows")],
    [
      rowView(
        [
          specView(
            "crumbs over the page head: the path, then the screen's h1",
            [
              Stack.view(
                {
                  body: [
                    Crumbs.view(
                      {
                        crumbs: [
                          { label: "library", href: "#layout-library" },
                          { label: "notes", href: "#layout-notes" },
                          { label: "field notes" },
                        ],
                      },
                      h
                    ),
                    PageHead.view(
                      {
                        title: "Field notes (sample)",
                        meta: "12 items",
                        actions: [
                          Button.view(
                            {
                              label: "add",
                              glyph: "plus",
                              attributes: [h.Inert(true)],
                            },
                            h
                          ),
                        ],
                      },
                      h
                    ),
                  ],
                },
                h
              ),
            ],
            h
          ),
        ],
        h
      ),
      rowView(
        [
          specView(
            "panel: title, meta, actions, body and foot",
            [
              Panel.view(
                {
                  id: "sample-queue",
                  title: "queue",
                  meta: "3",
                  actions: [
                    Button.view(
                      {
                        label: "clear",
                        isSmall: true,
                        attributes: [h.Inert(true)],
                      },
                      h
                    ),
                  ],
                  body: [h.p([], ["Three items wait for review (sample)."])],
                  foot: [
                    h.span([h.Class("note-line")], ["Updated a minute ago."]),
                  ],
                },
                h
              ),
            ],
            h
          ),
          specView(
            "stack: a column, a gap apart",
            [
              Stack.view(
                { body: [box("one", h), box("two", h), box("three", h)] },
                h
              ),
            ],
            h
          ),
          specView(
            "group: one line that never wraps",
            [
              Group.view(
                {
                  body: [
                    h.span([], ["release"]),
                    Chip.view({ label: "live", tone: "Go" }, h),
                  ],
                },
                h
              ),
            ],
            h
          ),
          specView(
            "wrap: a line that wraps, the same gap down",
            [
              Wrap.view(
                {
                  body: [
                    Chip.view({ label: "draft" }, h),
                    Chip.view({ label: "review", tone: "Warn" }, h),
                    Chip.view({ label: "blocked", tone: "Blocked" }, h),
                    Chip.view({ label: "done", tone: "Done" }, h),
                  ],
                },
                h
              ),
            ],
            h
          ),
        ],
        h
      ),
    ]
  );
