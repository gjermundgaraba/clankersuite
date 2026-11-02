import { Story } from "foldkit";
import { describe, expect, it } from "vite-plus/test";

import * as HistoryExample from "./history.ts";

describe("History example", () => {
  it("pages back through older activity and returns to the latest", () => {
    Story.story(
      HistoryExample.update,
      Story.given(HistoryExample.init()),
      Story.message(HistoryExample.Message.ClickedOlderActivity()),
      Story.message(HistoryExample.Message.ClickedOlderActivity()),
      Story.model((model) => {
        expect(model.pageIndex).toBe(2);
      }),
      Story.message(HistoryExample.Message.ClickedLatestActivity()),
      Story.model((model) => {
        expect(model.pageIndex).toBe(0);
      })
    );
  });
});
