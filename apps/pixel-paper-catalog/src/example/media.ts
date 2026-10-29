import {
  AudioFrame,
  ImageFrame,
  Media,
  VideoFrame,
} from "@gjermundgaraba/pixel-paper";
import { Option, Record, Schema } from "effect";
import type { Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { modifyFields } from "foldkit/struct";
import { defineView } from "foldkit/submodel";
import * as Update from "foldkit/update";

import { rowView, specView } from "../spec.ts";

// SAMPLE

// NOTE: the files in site/public, drawn and generated for the specimen.
const HILLS = "/sample-hills.png";
const PLANT = "/sample-plant.png";
const VIDEO = "/sample-cells.mp4";
const POSTER = "/sample-cells-poster.png";
const TONES = "/sample-tones.mp3";

const CAPTIONS: VideoFrame.Captions = {
  src: "/sample-cells.vtt",
  language: "en",
  label: "English",
};

const VIDEO_SIZE = Media.FrameSize.Pixels({ width: 384, height: 216 });

const Player = Schema.Literals([
  "Video",
  "VideoLoading",
  "VideoMissing",
  "Audio",
  "AudioLoading",
  "AudioMissing",
]);

type Player = typeof Player.Type;

export const Model = Schema.Struct({
  players: Schema.Record(Player, Media.Model),
  isPictureBroken: Schema.Boolean,
});

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  GotPlayerMessage: { playerId: Player, message: Media.Message },
  CompletedDetectBrokenImage: {},
  ClickedRetryPicture: {},
});

export type Message = typeof Message.Type;

const mediaElementId = (player: Player): string => `media-${player}`;

export const init = (): Model => ({
  players: {
    Video: Media.init({ id: mediaElementId("Video") }),
    VideoLoading: Media.init({ id: mediaElementId("VideoLoading") }),
    VideoMissing: Media.init({ id: mediaElementId("VideoMissing") }),
    Audio: Media.init({ id: mediaElementId("Audio") }),
    AudioLoading: Media.init({ id: mediaElementId("AudioLoading") }),
    AudioMissing: Media.init({ id: mediaElementId("AudioMissing") }),
  },
  isPictureBroken: false,
});

const foldPlayerOutMessage = () =>
  Media.OutMessage.match<Update.Step<Model, Message>>({
    Retried: () => (model) => ({ model }),
  });

const foldPlayer = Update.foldChildAt({
  update: Media.update,
  readAt: (model: Model, player: Player) => Option.some(model.players[player]),
  writeAt: (model, player, nextPlayer) =>
    modifyFields(model, { players: Record.set(player, nextPlayer) }),
  toParentMessage: (player, message) =>
    Message.GotPlayerMessage({ playerId: player, message }),
  foldOutMessage: foldPlayerOutMessage,
});

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    GotPlayerMessage: ({ playerId, message: playerMessage }) =>
      foldPlayer(model, playerId, playerMessage),
    CompletedDetectBrokenImage: () => ({
      model: modifyFields(model, { isPictureBroken: () => true }),
    }),
    ClickedRetryPicture: () => ({
      model: modifyFields(model, { isPictureBroken: () => false }),
    }),
  });

const toPlayerMessage =
  (player: Player) =>
  (message: Media.Message): Message =>
    Message.GotPlayerMessage({ playerId: player, message });

const videoView = (
  model: Model,
  player: Player,
  viewInputs: VideoFrame.ViewInputs,
  h: HtmlBuilder<Message>
): Html =>
  h.submodel({
    slotId: Media.id(model.players[player]),
    model: model.players[player],
    view: VideoFrame.view,
    viewInputs,
    toParentMessage: toPlayerMessage(player),
  });

const audioView = (
  model: Model,
  player: Player,
  viewInputs: AudioFrame.ViewInputs,
  h: HtmlBuilder<Message>
): Html =>
  h.submodel({
    slotId: Media.id(model.players[player]),
    model: model.players[player],
    view: AudioFrame.view,
    viewInputs,
    toParentMessage: toPlayerMessage(player),
  });

const picturesView = (model: Model, h: HtmlBuilder<Message>): Html =>
  rowView(
    [
      specView(
        "loaded, with a caption and a credit",
        [
          ImageFrame.view(
            {
              src: HILLS,
              alt: "A pixel drawing of hills under a white sun, two birds in the sky.",
              size: Media.FrameSize.Pixels({ width: 360, height: 240 }),
              caption: ["Hills under a white sun, drawn cell by cell."],
              credit: ["sample art"],
              isEager: true,
            },
            h
          ),
        ],
        h
      ),
      specView(
        "loading: the space is kept from the first paint",
        [
          ImageFrame.view(
            {
              src: PLANT,
              alt: "A pixel drawing of a plant in a pot.",
              size: Media.FrameSize.Pixels({ width: 160, height: 160 }),
              held: "Loading",
            },
            h
          ),
        ],
        h
      ),
      specView(
        "broken: a source that is not there, with retry",
        [
          ImageFrame.view(
            {
              src: "/sample-missing.png",
              alt: "A pixel drawing of a plant in a pot.",
              size: Media.FrameSize.Pixels({ width: 240, height: 160 }),
              held: model.isPictureBroken ? "Broken" : undefined,
              onBroken: Message.CompletedDetectBrokenImage(),
              onRetry: Message.ClickedRetryPicture(),
            },
            h
          ),
        ],
        h
      ),
    ],
    h
  );

const videosView = (model: Model, h: HtmlBuilder<Message>): Html =>
  rowView(
    [
      specView(
        "video: poster, captions; space or k plays, the arrows seek",
        [
          videoView(
            model,
            "Video",
            {
              src: VIDEO,
              poster: POSTER,
              captions: CAPTIONS,
              label: "Sample video: a field of cells",
              size: VIDEO_SIZE,
              caption: ["A field of cells, lighting and going out."],
              credit: ["sample video · 6s"],
            },
            h
          ),
        ],
        h
      ),
      specView(
        "loading: waiting for data",
        [
          videoView(
            model,
            "VideoLoading",
            {
              src: VIDEO,
              poster: POSTER,
              label: "Sample video, loading",
              size: VIDEO_SIZE,
              held: "Loading",
            },
            h
          ),
        ],
        h
      ),
      specView(
        "cannot play: a source that is not there, with retry",
        [
          videoView(
            model,
            "VideoMissing",
            {
              src: "/sample-missing.mp4",
              label: "Sample video that is not there",
              size: VIDEO_SIZE,
              hasRetry: true,
            },
            h
          ),
        ],
        h
      ),
    ],
    h
  );

const soundsView = (model: Model, h: HtmlBuilder<Message>): readonly Html[] => [
  specView(
    "audio: a compact strip",
    [
      audioView(
        model,
        "Audio",
        { src: TONES, label: "Sample tones, rising and falling" },
        h
      ),
    ],
    h
  ),
  specView(
    "audio, loading: the time gives way to the word",
    [
      audioView(
        model,
        "AudioLoading",
        { src: TONES, label: "Sample tones, loading", held: "Loading" },
        h
      ),
    ],
    h
  ),
  specView(
    "audio that cannot play, with retry",
    [
      audioView(
        model,
        "AudioMissing",
        { src: "/sample-missing.mp3", label: "Sample tones", hasRetry: true },
        h
      ),
    ],
    h
  ),
];

export const view = defineView<Model, Message>((model, h): Html =>
  h.div(
    [h.Class("spec-rows")],
    [picturesView(model, h), videosView(model, h), ...soundsView(model, h)]
  )
);
