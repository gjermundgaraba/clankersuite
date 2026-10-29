export const keydown = (
  key: string,
  init: KeyboardEventInit = {}
): KeyboardEvent =>
  new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    cancelable: true,
    ...init,
  });

const preventDefault = (event: Event): void => {
  event.preventDefault();
};

export const readDuringDispatch = <A, E extends Event>(
  target: EventTarget,
  event: E,
  read: (event: E) => A,
  {
    listenOn = target,
    isHandled = false,
    isCapture = false,
  }: Readonly<{
    listenOn?: EventTarget;
    isHandled?: boolean;
    isCapture?: boolean;
  }> = {}
): A => {
  const results: A[] = [];

  const listen = (): void => {
    results.push(read(event));
  };

  if (isHandled) {
    target.addEventListener(event.type, preventDefault);
  }

  listenOn.addEventListener(event.type, listen, { capture: isCapture });
  target.dispatchEvent(event);
  listenOn.removeEventListener(event.type, listen, { capture: isCapture });
  target.removeEventListener(event.type, preventDefault);
  const [result] = results;

  if (results.length !== 1 || result === undefined) {
    throw new Error(`The ${event.type} did not reach the listener once.`);
  }

  return result;
};
