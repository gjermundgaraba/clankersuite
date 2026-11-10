import { Option } from "effect";

export const htmlElement = (
  selector: string,
  root: ParentNode = document
): Option.Option<HTMLElement> => {
  const element = root.querySelector(selector);

  return element instanceof HTMLElement ? Option.some(element) : Option.none();
};

export const htmlElementById = (id: string): Option.Option<HTMLElement> =>
  htmlElement(`#${CSS.escape(id)}`);
