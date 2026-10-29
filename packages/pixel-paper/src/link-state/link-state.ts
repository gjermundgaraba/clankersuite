import { Match, Schema } from "effect";
import type { Html, HtmlBuilder } from "foldkit/html";

/** `Connecting`: the first reach, muted and working. `Reconnecting`: the link dropped and is
 *  coming back, on amber. `Offline`: given up, on red. Both stay visible on a phone. */
export const State = Schema.Literals([
  "Online",
  "Connecting",
  "Reconnecting",
  "Offline",
]);

export type State = typeof State.Type;

const stateWord = (state: State): string =>
  Match.value(state).pipe(
    Match.withReturnType<string>(),
    Match.when("Online", () => "online"),
    Match.when("Connecting", () => "connecting"),
    Match.when("Reconnecting", () => "reconnecting"),
    Match.when("Offline", () => "offline"),
    Match.exhaustive
  );

/** Configuration for rendering a connection word with `view`. */
export type ViewConfig = Readonly<{
  state: State;
  /** The words; the state's name by default. */
  label?: string;
}>;

/** The connection word, in a top bar or a status bar. It is a status (`role="status"`), so a
 *  change of state is read out; while it connects it prints the working cursor. */
export const view = <Message>(
  config: ViewConfig,
  h: HtmlBuilder<Message>
): Html => {
  const { state, label = stateWord(state) } = config;
  const isWorking = state === "Connecting" || state === "Reconnecting";

  return h.span(
    [
      h.Role("status"),
      h.Class(`link-state${state === "Online" ? "" : ` ${stateWord(state)}`}`),
    ],
    [
      label,
      ...(isWorking ? [h.span([h.Class("cursor"), h.AriaHidden(true)])] : []),
    ]
  );
};
