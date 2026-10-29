import { Meter, Panel, Stat } from "@gjermundgaraba/pixel-paper";
import { Option } from "effect";
import type { Html, HtmlBuilder } from "foldkit/html";

import { rowView, specView, wideSpecView } from "../spec.ts";

const columnView = <Message>(
  id: string,
  title: string,
  period: string,
  percent: number,
  h: HtmlBuilder<Message>
): Html =>
  Panel.view(
    {
      id,
      title,
      isFlush: true,
      body: [
        Meter.listView(
          {
            meters: [
              {
                id: `${id}-tokens`,
                label: "Tokens",
                detail: [`${period} limit`],
                value: percent,
                max: 100,
                valueText: `${percent}% used`,
                hasNumbers: false,
                foot: ["Resets at midnight"],
              },
              {
                id: `${id}-requests`,
                label: "Requests",
                value: percent * 120,
                max: 12_000,
              },
            ],
          },
          h
        ),
      ],
    },
    h
  );

export const view = <Message>(h: HtmlBuilder<Message>): Html =>
  h.div(
    [h.Class("spec-rows")],
    [
      rowView(
        [
          wideSpecView(
            "meters in a flush panel: plain, amber from 80%, a red chip at the maximum, stale, a percentage alone",
            [
              Panel.view(
                {
                  id: "meters-usage",
                  title: "Usage (sample)",
                  isFlush: true,
                  body: [
                    Meter.listView(
                      {
                        meters: [
                          {
                            id: "meter-storage",
                            label: "Storage",
                            detail: ["workspace (sample)"],
                            value: 1200,
                            max: 5000,
                            unit: "MB",
                            foot: ["Read a minute ago"],
                          },
                          {
                            id: "meter-requests",
                            label: "Requests",
                            detail: ["this month (sample)"],
                            value: 41_200,
                            max: 50_000,
                            foot: ["Resets in 4 days"],
                          },
                          {
                            id: "meter-seats",
                            label: "Seats",
                            value: 5,
                            max: 5,
                            full: "full",
                          },
                          {
                            id: "meter-builds",
                            label: "Build minutes",
                            value: 300,
                            max: 1000,
                            isStale: true,
                            foot: ["Last read 2 hours ago: the reading failed"],
                          },
                          {
                            id: "meter-window",
                            label: "Session window",
                            value: 62,
                            max: 100,
                            valueText: "62% used",
                            hasNumbers: false,
                            foot: ["Resets in 3 hours"],
                          },
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
          specView(
            "cells: a strength",
            [
              Meter.cellsView(
                {
                  id: "meter-strength",
                  count: 4,
                  on: 3,
                  label: "Password strength",
                  valueText: "strong",
                  isShort: true,
                },
                h
              ),
            ],
            h
          ),
        ],
        h
      ),
      wideSpecView(
        "meters in columns: each list lays its rows out by its own width",
        [
          h.div(
            [h.Class("spec-grid")],
            [
              columnView("meters-column-a", "Daily (sample)", "daily", 18, h),
              columnView("meters-column-b", "Weekly (sample)", "weekly", 87, h),
            ]
          ),
        ],
        h
      ),
      wideSpecView(
        "toned meters, for a wall of limits scanned by level: the lit cells take the reading's amber or red",
        [
          Panel.view(
            {
              id: "meters-toned",
              title: "Limits (sample)",
              isFlush: true,
              body: [
                Meter.listView(
                  {
                    meters: [
                      {
                        id: "meter-toned-session",
                        label: "Session",
                        value: 34,
                        max: 100,
                        valueText: "34% used",
                        hasNumbers: false,
                        isToned: true,
                        foot: ["Resets in 3 hours"],
                      },
                      {
                        id: "meter-toned-weekly",
                        label: "Weekly",
                        value: 94,
                        max: 100,
                        valueText: "94% used",
                        hasNumbers: false,
                        isToned: true,
                        foot: ["Resets in 2 days"],
                      },
                      {
                        id: "meter-toned-monthly",
                        label: "Monthly",
                        value: 100,
                        max: 100,
                        valueText: "100% used",
                        hasNumbers: false,
                        isToned: true,
                        foot: ["Resets in 11 days"],
                      },
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
      specView(
        "stats: a figure, a change, one not known, one on its way",
        [
          Stat.listView(
            {
              stats: [
                {
                  label: "Requests today",
                  maybeValue: Option.some(41_200),
                  delta: 12,
                  deltaUnit: "%",
                  note: ["against yesterday (sample)"],
                },
                {
                  label: "Median latency",
                  maybeValue: Option.some(84),
                  unit: "ms",
                  delta: 31,
                  deltaUnit: " ms",
                  tone: "Warn",
                },
                { label: "Errors", maybeValue: Option.none() },
                { label: "Queue", maybeValue: Option.none(), isLoading: true },
              ],
            },
            h
          ),
        ],
        h
      ),
    ]
  );
