import type { Attribute, ChildAttribute } from "foldkit/html";

/** Attributes passed through to an element. Never a class: a later class replaces an earlier
 *  one, so a passthrough class would wipe the system's own. */
export type Attributes<Message> = ReadonlyArray<
  Attribute<Message> | ChildAttribute
>;
