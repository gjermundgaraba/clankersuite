import { Runtime } from "foldkit";

export type Harness<Model, Message> = Omit<
  Runtime.ElementConfig<Model, Message>,
  "container"
>;

const handles: Runtime.EmbedHandle[] = [];

export const embed = <Model, Message extends { _tag: string }>(
  harness: Harness<Model, Message>
): void => {
  const container = document.createElement("div");
  container.id = `harness-${handles.length}`;
  document.body.append(container);
  handles.push(Runtime.embed(Runtime.makeElement({ ...harness, container })));
};

export const disposeEmbedded = (): void => {
  for (const handle of handles.splice(0)) {
    handle.dispose();
  }
};
