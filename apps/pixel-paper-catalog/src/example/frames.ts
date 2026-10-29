import {
  Announcer,
  Banner,
  Button,
  Chip,
  Field,
  IconButton,
  LinkState,
  NavStrip,
  Places,
  StatusBar,
  TopBar,
  Wall,
  Window,
  Wordmark,
} from "@gjermundgaraba/pixel-paper";
import type { KeyHint } from "@gjermundgaraba/pixel-paper";
import { Array, Schema } from "effect";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";
import { defineView } from "foldkit/submodel";
import type * as Update from "foldkit/update";

import { rowView, specView } from "../spec.ts";

const Area = Schema.Literals(["Inbox", "Later", "Archive"]);

type Area = typeof Area.Type;

export const Model = Schema.Struct({
  area: Area,
  isRunning: Schema.Boolean,
  address: Schema.String,
});

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  GotTopBarMessage: { message: TopBar.Message },
  GotStatusBarMessage: { message: StatusBar.Message },
  SelectedArea: { area: Area },
  ToggledRunning: {},
  UpdatedAddress: { value: Schema.String },
  ClickedReload: {},
  ClickedRetry: {},
  CompletedAnnounce: {},
});

export type Message = typeof Message.Type;

export const init = (): Model => ({
  area: "Inbox",
  isRunning: true,
  address: "https://example.com/",
});

const SAMPLE_BANNER =
  "Reconnecting. Your changes wait here until the link is back.";

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    GotTopBarMessage: () => ({ model }),
    GotStatusBarMessage: () => ({ model }),
    SelectedArea: ({ area }) => ({
      model: modifyFields(model, { area: () => area }),
    }),
    ToggledRunning: () => ({
      model: modifyFields(model, { isRunning: (isRunning) => !isRunning }),
    }),
    UpdatedAddress: ({ value }) => ({
      model: modifyFields(model, { address: () => value }),
    }),
    ClickedReload: () => ({
      model,
      commands: [Announcer.Announce({ text: "Reloaded the sample page." })],
    }),
    ClickedRetry: () => ({
      model,
      commands: [Announcer.Announce({ text: SAMPLE_BANNER })],
    }),
    CompletedAnnounce: () => ({ model }),
  });

export type ViewInputs = Readonly<{ platform: KeyHint.KeyPlatform }>;

const sampleTopBar = (h: HtmlBuilder<Message>): Html =>
  TopBar.view(
    {
      brand: [Wordmark.view({ label: "ledger" }, h)],
      toParentMessage: (message) => Message.GotTopBarMessage({ message }),
      nav: [
        NavStrip.view(
          {
            label: "Sample sections",
            items: [
              {
                href: "#frames-queue",
                label: "queue",
                count: 3,
                isCurrent: true,
              },
              { href: "#frames-done", label: "done" },
            ],
          },
          h
        ),
      ],
      tools: [LinkState.view({ state: "Online" }, h)],
    },
    h
  );

const sampleStatusBar = (
  platform: KeyHint.KeyPlatform,
  h: HtmlBuilder<Message>
): Html =>
  StatusBar.view(
    {
      body: [LinkState.view({ state: "Reconnecting" }, h), "4 items (sample)"],
      toParentMessage: (message) => Message.GotStatusBarMessage({ message }),
      keys: [
        { keys: "Mod+K", does: "commands" },
        { keys: "?", does: "keys" },
      ],
      platform,
    },
    h
  );

const sampleWindow = (model: Model, h: HtmlBuilder<Message>): Html =>
  Window.view(
    {
      id: "sample-machine",
      title: "sample machine",
      glyph: "machine",
      status: [
        model.isRunning
          ? Chip.view({ label: "running", tone: "Go" }, h)
          : Chip.view({ label: "starting", isBusy: true }, h),
      ],
      tools: [
        IconButton.view(
          {
            glyph: model.isRunning ? "pause" : "play",
            label: model.isRunning ? "Pause" : "Start",
            onClick: Message.ToggledRunning(),
          },
          h
        ),
      ],
      body: [h.p([h.Class("note-line")], ["2 cpu, 4 GB (sample)"])],
    },
    h
  );

const sampleBrowserTools = (h: HtmlBuilder<Message>): Html =>
  h.span(
    [h.Class("window-tools")],
    [
      IconButton.view(
        { glyph: "arrow-left", label: "Back", isDisabled: true },
        h
      ),
      IconButton.view(
        { glyph: "arrow-right", label: "Forward", isDisabled: true },
        h
      ),
      IconButton.view(
        { glyph: "refresh", label: "Reload", onClick: Message.ClickedReload() },
        h
      ),
    ]
  );

const sampleBrowser = (model: Model, h: HtmlBuilder<Message>): Html =>
  Window.view(
    {
      id: "sample-browser",
      title: "sample page",
      glyph: "globe",
      tools: [sampleBrowserTools(h)],
      body: [
        Field.view(
          {
            id: "sample-address",
            label: "Address",
            value: model.address,
            onInput: (value) => Message.UpdatedAddress({ value }),
            isMono: true,
            isLabelHidden: true,
          },
          h
        ),
        h.p([h.Class("note-line")], ["The page draws here (sample)."]),
      ],
    },
    h
  );

const placesView = (model: Model, h: HtmlBuilder<Message>): Html =>
  Places.view(
    {
      label: "Sample areas",
      places: Array.map(Area.literals, (area) => ({
        id: area,
        label: area,
        isCurrent: model.area === area,
        onSelect: Message.SelectedArea({ area }),
      })),
    },
    h
  );

const linkPlacesView = (h: HtmlBuilder<Message>): Html =>
  Places.view(
    {
      label: "Sample collections",
      places: [
        {
          id: "reading",
          label: "Reading",
          isCurrent: true,
          href: "#frames-reading",
        },
        {
          id: "listening",
          label: "Listening",
          href: "#frames-listening",
        },
      ],
    },
    h
  );

const barsView = (
  platform: KeyHint.KeyPlatform,
  h: HtmlBuilder<Message>
): Html =>
  rowView(
    [
      specView(
        "top bar: brand, nav strip, tools (this page's own is one)",
        [h.div([h.Class("spec-frame")], [sampleTopBar(h)])],
        h
      ),
      specView(
        "status bar: the state, then the keys",
        [h.div([h.Class("spec-frame")], [sampleStatusBar(platform, h)])],
        h
      ),
    ],
    h
  );

const sampleBanner = (h: HtmlBuilder<Message>): Html =>
  Banner.view(
    {
      tone: "Warn",
      body: [SAMPLE_BANNER],
      actions: [
        Button.view(
          { label: "retry", isSmall: true, onClick: Message.ClickedRetry() },
          h
        ),
      ],
    },
    h
  );

const connectionView = (h: HtmlBuilder<Message>): Html =>
  rowView(
    [
      specView(
        "the connection word",
        [
          h.span(
            [h.Class("spec-inline")],
            [
              LinkState.view({ state: "Online" }, h),
              LinkState.view({ state: "Connecting" }, h),
              LinkState.view({ state: "Reconnecting" }, h),
              LinkState.view({ state: "Offline" }, h),
            ]
          ),
        ],
        h
      ),
      specView(
        "banner: a state the whole interface is in",
        [h.div([h.Class("spec-frame")], [sampleBanner(h)])],
        h
      ),
    ],
    h
  );

const toolsView = (model: Model, h: HtmlBuilder<Message>): Html =>
  rowView(
    [
      specView(
        "window: kind, state and tools in its title bar",
        [
          h.div(
            [h.Class("spec-stage")],
            [h.div([h.Class("spec-window")], [sampleWindow(model, h)])]
          ),
        ],
        h
      ),
      specView(
        "window: a child's tools as one group, an address named for screen readers",
        [
          h.div(
            [h.Class("spec-stage")],
            [h.div([h.Class("spec-window")], [sampleBrowser(model, h)])]
          ),
        ],
        h
      ),
      specView(
        "places: where to go, the current one inverted",
        [h.div([h.Class("panel")], [placesView(model, h)])],
        h
      ),
      specView(
        "places with addresses: links, which a new tab can open",
        [h.div([h.Class("panel")], [linkPlacesView(h)])],
        h
      ),
    ],
    h
  );

const wallView = (h: HtmlBuilder<Message>): Html =>
  rowView(
    [
      specView(
        "wall mark: the name over a wall's card",
        [Wall.markView({ brand: [Wordmark.view({ label: "ledger" }, h)] }, h)],
        h
      ),
    ],
    h
  );

export const view = defineView<Model, Message, ViewInputs>(
  (model, { platform }, h): Html =>
    h.div(
      [h.Class("spec-rows")],
      [
        barsView(platform, h),
        connectionView(h),
        toolsView(model, h),
        wallView(h),
      ]
    )
);
