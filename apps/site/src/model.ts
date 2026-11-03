import { Scheme } from "@gjermundgaraba/components";
import { Schema } from "effect";

import { AppRoute } from "./route.ts";

export const Model = Schema.Struct({
  route: AppRoute,
  schemeSwitch: Scheme.SchemeSwitch.Model,
});

export type Model = typeof Model.Type;
