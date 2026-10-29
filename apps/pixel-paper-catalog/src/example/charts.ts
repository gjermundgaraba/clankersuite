import { BarChart, LineChart } from "@gjermundgaraba/pixel-paper";
import { Array, Option } from "effect";
import type { Html, HtmlBuilder } from "foldkit/html";

import { rowView, specView } from "../spec.ts";

// SAMPLE

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const SAMPLE_REQUESTS = [1200, 1900, 1500, 2400, 2100, 400, 300];

const SAMPLE_CLIENTS: readonly BarChart.BarPoint[] = [
  { label: "Northwind (sample)", maybeValue: Option.some(41_200) },
  { label: "Contoso (sample)", maybeValue: Option.some(18_800), tone: "Warn" },
  { label: "Fabrikam (sample)", maybeValue: Option.none() },
  {
    label: "Tailspin (sample)",
    maybeValue: Option.some(51_000),
    tone: "Error",
  },
];

export const view = <Message>(h: HtmlBuilder<Message>): Html =>
  rowView(
    [
      specView(
        "columns: a run over time",
        [
          BarChart.view(
            {
              label: "Requests by day (sample)",
              category: "Day",
              unit: "requests",
              points: Array.zipWith(
                DAYS,
                SAMPLE_REQUESTS,
                (label, requests) => ({
                  label,
                  maybeValue: Option.some(requests),
                })
              ),
            },
            h
          ),
        ],
        h
      ),
      specView(
        "rows: long names, one with no reading, two toned",
        [
          BarChart.view(
            {
              label: "Requests by client (sample)",
              category: "Client",
              unit: "requests",
              isRows: true,
              max: 50_000,
              points: SAMPLE_CLIENTS,
            },
            h
          ),
        ],
        h
      ),
      specView(
        "a stepped line, two series, a gap where a reading is missing",
        [
          LineChart.view(
            {
              label: "Latency by version (sample)",
              category: "Version",
              unit: "ms",
              labels: ["v1", "v2", "v3", "v4", "v5", "v6"],
              series: [
                {
                  name: "median",
                  values: [
                    Option.some(40),
                    Option.some(42),
                    Option.none(),
                    Option.some(55),
                    Option.some(48),
                    Option.some(46),
                  ],
                },
                {
                  name: "slowest",
                  values: Array.map([90, 120, 110, 160, 130, 125], (value) =>
                    Option.some(value)
                  ),
                },
              ],
            },
            h
          ),
        ],
        h
      ),
      specView(
        "nothing to chart",
        [
          BarChart.view(
            {
              label: "Requests (sample)",
              points: [],
              empty: "no requests yet",
            },
            h
          ),
        ],
        h
      ),
    ],
    h
  );
