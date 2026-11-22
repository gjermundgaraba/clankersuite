import { Schema } from "effect";
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

export type ViewConfig = Readonly<{
  state: State;
  /** The words; the state's name by default. */
  label?: string;
}>;

/** The connection word, in a top bar or a status bar. It is a status (`role="status"`), so a
 *  change of state is read out; while it connects it prints a spinner. */
export const view = <Message>(
  config: ViewConfig,
  h: HtmlBuilder<Message>
): Html => {
  const { state, label = state } = config;
  const isWorking = state === "Connecting" || state === "Reconnecting";

  return h.span(
    [
      h.Role("status"),
      h.Class(
        `gg-link-state${state === "Online" ? "" : ` gg-${state.toLowerCase()}`}`
      ),
    ],
    [
      label,
      ...(isWorking
        ? [h.span([h.Class("gg-spinner"), h.AriaHidden(true)])]
        : []),
    ]
  );
};
