import { setTimeout as sleep } from "node:timers/promises";

const MAX_WAITS = 50;
const WAIT_MILLIS = 10;

export const settle = async (millis = 0): Promise<void> => {
  await sleep(millis);
};

export const settleUntil = async (
  isReady: () => boolean,
  waits = MAX_WAITS
): Promise<void> => {
  if (isReady()) {
    return;
  }

  if (waits === 0) {
    throw new Error("settleUntil ran out of waits before the condition held.");
  }

  await settle(WAIT_MILLIS);
  await settleUntil(isReady, waits - 1);
};
