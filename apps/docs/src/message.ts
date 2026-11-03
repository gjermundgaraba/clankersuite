import { Scheme, TopBar } from "@gjermundgaraba/components";
import { defineMessageUnion } from "foldkit/message";
import { UrlRequest } from "foldkit/navigation";
import { Url } from "foldkit/url";

export const Message = defineMessageUnion({
  ClickedLink: { request: UrlRequest },
  ChangedUrl: { url: Url },
  CompletedNavigateInternal: {},
  CompletedLoadExternal: {},
  CompletedMountExample: {},
  CompletedScrollToFragment: {},
  GotSchemeSwitchMessage: { message: Scheme.SchemeSwitch.Message },
  GotTopBarMessage: { message: TopBar.Message },
});

export type Message = typeof Message.Type;
