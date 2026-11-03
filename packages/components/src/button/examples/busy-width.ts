import { Button, Group, Stack } from "@gjermundgaraba/components";
import type { Html, HtmlBuilder } from "foldkit/html";

const atRestThenBusy = <Message>(
  config: Button.ViewConfig<Message>,
  h: HtmlBuilder<Message>
): Html =>
  Group.view(
    {
      body: [
        Button.view(config, h),
        Button.view({ ...config, isBusy: true }, h),
      ],
    },
    h
  );

export const view = <Message>(h: HtmlBuilder<Message>): Html =>
  Stack.view(
    {
      body: [
        atRestThenBusy({ label: "save", variant: "Primary" }, h),
        atRestThenBusy({ label: "retry", isSmall: true }, h),
      ],
    },
    h
  );
