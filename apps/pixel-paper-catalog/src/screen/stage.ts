import {
  Announcer,
  Button,
  Chip,
  CodeSurface,
  ConfirmDialog,
  IconButton,
  LinkState,
  Notice,
  PropsList,
  Stage,
  StatusBar,
  Window,
} from "@gjermundgaraba/pixel-paper";
import type { Glyph, KeyHint } from "@gjermundgaraba/pixel-paper";
import { Array, Duration, Effect, Option, Schema } from "effect";
import * as Command from "foldkit/command";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";
import { defineView } from "foldkit/submodel";
import * as Update from "foldkit/update";

import { TERMINAL_LINES } from "../sample.ts";
import { SITE_KEY_NOTES } from "../site-keys.ts";

const Tool = Schema.Literals(["Select", "Note", "Terminal", "Machine"]);

type Tool = typeof Tool.Type;

const StageWindow = Schema.Literals(["Note", "Terminal", "Machine"]);

type StageWindow = typeof StageWindow.Type;

export const Model = Schema.Struct({
  tool: Tool,
  isLinkDropped: Schema.Boolean,
  isStarting: Schema.Boolean,
  closed: Schema.Array(StageWindow),
  isWhole: Schema.Boolean,
  stopConfirm: ConfirmDialog.Model,
});

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  GotStatusBarMessage: { message: StatusBar.Message },
  SelectedTool: { tool: Tool },
  ClickedDropLink: {},
  CompletedWaitBeforeLinkReturn: {},
  ClickedReopen: {},
  ClickedCloseWindow: { stageWindow: StageWindow },
  ToggledWholeStage: {},
  ClickedStart: {},
  ClickedStop: {},
  GotStopConfirmMessage: { message: ConfirmDialog.Message },
  CompletedAnnounce: {},
});

export type Message = typeof Message.Type;

export const init = (): Model => ({
  tool: "Select",
  isLinkDropped: false,
  isStarting: false,
  closed: [],
  isWhole: false,
  stopConfirm: ConfirmDialog.init({ id: "stage-stop" }),
});

const LINK_RETURN = Duration.seconds(4);

export const WaitBeforeLinkReturn = Command.define("WaitBeforeLinkReturn", {
  messages: [Message.CompletedWaitBeforeLinkReturn],
  execute: Effect.sleep(LINK_RETURN).pipe(
    Effect.as(Message.CompletedWaitBeforeLinkReturn())
  ),
});

const NAMES: Readonly<Record<StageWindow, string>> = {
  Note: "sample note",
  Terminal: "sample terminal",
  Machine: "sample machine",
};

const stopConfirmFold = {
  read: (model: Model) => Option.some(model.stopConfirm),
  write: (model: Model, nextStopConfirm: ConfirmDialog.Model): Model =>
    modifyFields(model, { stopConfirm: () => nextStopConfirm }),
  toParentMessage: (message: ConfirmDialog.Message) =>
    Message.GotStopConfirmMessage({ message }),
};

const foldStopConfirmOpen = Update.foldChildStep({
  update: ConfirmDialog.open,
  ...stopConfirmFold,
});

const foldStopConfirmClose = Update.foldChildStep({
  update: ConfirmDialog.close,
  ...stopConfirmFold,
});

const foldStopConfirm = Update.foldChild({
  update: ConfirmDialog.update,
  ...stopConfirmFold,
  foldOutMessage: ConfirmDialog.OutMessage.match<Update.Step<Model, Message>>({
    Confirmed: () => (current) =>
      foldStopConfirmClose(modifyFields(current, { isStarting: () => false })),
    Cancelled: () => (current) => ({ model: current }),
  }),
});

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    GotStatusBarMessage: () => ({ model }),
    SelectedTool: ({ tool }) => ({
      model: modifyFields(model, { tool: () => tool }),
    }),
    ClickedDropLink: () =>
      model.isLinkDropped
        ? { model }
        : {
            model: modifyFields(model, { isLinkDropped: () => true }),
            commands: [WaitBeforeLinkReturn()],
          },
    CompletedWaitBeforeLinkReturn: () => ({
      model: modifyFields(model, { isLinkDropped: () => false }),
    }),
    ClickedReopen: () => ({
      model: modifyFields(model, { closed: () => [] }),
      commands: [Announcer.Announce({ text: "Reopened every window." })],
    }),
    ClickedCloseWindow: ({ stageWindow }) => ({
      model: modifyFields(model, {
        closed: Array.append(stageWindow),
        isWhole: (isWhole) => isWhole && stageWindow !== "Terminal",
      }),
      commands: [
        Announcer.Announce({ text: `Closed the ${NAMES[stageWindow]}.` }),
      ],
    }),
    ToggledWholeStage: () => ({
      model: modifyFields(model, { isWhole: (isWhole) => !isWhole }),
    }),
    ClickedStart: () => ({
      model: modifyFields(model, { isStarting: () => true }),
    }),
    ClickedStop: () => foldStopConfirmOpen(model),
    GotStopConfirmMessage: ({ message: confirmMessage }) =>
      foldStopConfirm(model, confirmMessage),
    CompletedAnnounce: () => ({ model }),
  });

export const isDialogOpen = (model: Model): boolean =>
  ConfirmDialog.isOpen(model.stopConfirm);

export type ViewInputs = Readonly<{
  platform: KeyHint.KeyPlatform;
  toScreenNavView: () => Html;
  toLiveRegionView?: (() => Html) | undefined;
}>;

const TOOLS: ReadonlyArray<readonly [Glyph.GlyphName, Tool]> = [
  ["pointer", "Select"],
  ["note", "Note"],
  ["terminal", "Terminal"],
  ["machine", "Machine"],
];

const isOpen = (model: Model, stageWindow: StageWindow): boolean =>
  !Array.contains(model.closed, stageWindow);

const toolsView = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [
      h.Role("group"),
      h.AriaLabel("Sample canvas tools"),
      h.Class("stack gap-s"),
    ],
    Array.map(TOOLS, ([glyph, tool]) =>
      IconButton.view(
        {
          glyph,
          label: tool,
          onClick: Message.SelectedTool({ tool }),
          attributes: [Button.pressedAttribute(model.tool === tool, h)],
        },
        h
      )
    )
  );

const barView = (
  model: Model,
  viewInputs: ViewInputs,
  h: HtmlBuilder<Message>
): readonly Html[] => [
  viewInputs.toScreenNavView(),
  h.span(
    [h.Class("spec-bar-slip")],
    [
      LinkState.view(
        { state: model.isLinkDropped ? "Reconnecting" : "Online" },
        h
      ),
      Button.view(
        {
          label: "drop the link",
          isSmall: true,
          isDisabled: model.isLinkDropped,
          onClick: Message.ClickedDropLink(),
        },
        h
      ),
      ...(Array.isReadonlyArrayNonEmpty(model.closed)
        ? [
            Button.view(
              {
                label: `reopen ${model.closed.length}`,
                isSmall: true,
                onClick: Message.ClickedReopen(),
              },
              h
            ),
          ]
        : []),
    ]
  ),
];

const noteView = (h: HtmlBuilder<Message>): Html =>
  h.keyed("div")(
    "note",
    [h.Class("spec-win note")],
    [
      Window.view(
        {
          id: "stage-note",
          title: NAMES.Note,
          glyph: "note",
          onClose: Message.ClickedCloseWindow({ stageWindow: "Note" }),
          body: [
            h.p(
              [],
              [
                "Check the south region before the second step. The first step can go at six.",
              ]
            ),
            h.p([h.Class("note-line")], ["Sample note."]),
          ],
        },
        h
      ),
    ]
  );

const terminalView = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.keyed("div")(
    "terminal",
    [h.Class(model.isWhole ? "spec-win whole" : "spec-win terminal")],
    [
      Window.view(
        {
          id: "stage-terminal",
          title: NAMES.Terminal,
          glyph: "terminal",
          isFlush: true,
          status: [Chip.view({ label: "connected", tone: "Go" }, h)],
          tools: [
            IconButton.view(
              {
                glyph: model.isWhole ? "shrink" : "expand",
                label: model.isWhole
                  ? "Give the stage back"
                  : "Take the whole stage",
                onClick: Message.ToggledWholeStage(),
              },
              h
            ),
          ],
          onClose: Message.ClickedCloseWindow({ stageWindow: "Terminal" }),
          body: [
            CodeSurface.view(
              {
                label: "Sample terminal",
                body: Array.map(TERMINAL_LINES, ({ id, prompt, ink, text }) =>
                  h.keyed("span")(
                    id,
                    [],
                    [
                      prompt,
                      h.span([h.Style({ color: `var(--${ink})` })], [text]),
                      "\n",
                    ]
                  )
                ),
              },
              h
            ),
          ],
        },
        h
      ),
    ]
  );

const machineView = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.keyed("div")(
    "machine",
    [h.Class("spec-win machine")],
    [
      Window.view(
        {
          id: "stage-machine",
          title: NAMES.Machine,
          glyph: "machine",
          status: [
            model.isStarting
              ? Chip.view({ label: "starting", isBusy: true }, h)
              : Chip.view({ label: "stopped" }, h),
          ],
          onClose: Message.ClickedCloseWindow({ stageWindow: "Machine" }),
          body: [
            PropsList.view(
              {
                items: [
                  { label: "image", value: ["base-2026"] },
                  { label: "size", value: ["2 cpu · 4 GB"] },
                ],
              },
              h
            ),
          ],
          foot: [
            h.span(
              [h.Class("push")],
              [
                Button.view(
                  {
                    label: model.isStarting ? "stop" : "start",
                    glyph: model.isStarting ? "stop" : "play",
                    isSmall: true,
                    onClick: model.isStarting
                      ? Message.ClickedStop()
                      : Message.ClickedStart(),
                  },
                  h
                ),
              ]
            ),
          ],
        },
        h
      ),
    ]
  );

export const DESCRIPTION =
  "The ground as a canvas: windows on it, tools at its edge.";

const pausedView = (h: HtmlBuilder<Message>): Html =>
  Notice.view(
    {
      title: "Editing paused",
      body: [
        "The link to the host dropped. Reconnecting now; nothing on the canvas is lost.",
      ],
    },
    h
  );

const canvasView = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [h.Class("spec-canvas")],
    [
      h.p([h.Class("spec-caption sample-line spec-win about")], [DESCRIPTION]),
      ...(isOpen(model, "Note") && !model.isWhole ? [noteView(h)] : []),
      ...(isOpen(model, "Terminal") ? [terminalView(model, h)] : []),
      ...(isOpen(model, "Machine") && !model.isWhole
        ? [machineView(model, h)]
        : []),
    ]
  );

export const view = defineView<Model, Message, ViewInputs>(
  (model, viewInputs, h): Html =>
    h.div(
      [h.Class("spec-bare")],
      [
        Stage.view(
          {
            ...(model.isLinkDropped && { paused: [pausedView(h)] }),
            tools: [toolsView(model, h)],
            bar: barView(model, viewInputs, h),
            body: [
              canvasView(model, h),
              h.submodel({
                slotId: ConfirmDialog.id(model.stopConfirm),
                model: model.stopConfirm,
                view: ConfirmDialog.view,
                viewInputs: {
                  title: "Stop",
                  question: "Stop the sample machine?",
                  body: [
                    "It has not finished starting. Its window stays on the canvas (sample).",
                  ],
                  label: "stop",
                  toLiveRegionView: viewInputs.toLiveRegionView,
                },
                toParentMessage: (message) =>
                  Message.GotStopConfirmMessage({ message }),
              }),
            ],
          },
          h
        ),
        StatusBar.view(
          {
            body: [],
            keys: SITE_KEY_NOTES,
            platform: viewInputs.platform,
            toParentMessage: (message) =>
              Message.GotStatusBarMessage({ message }),
          },
          h
        ),
      ]
    )
);
