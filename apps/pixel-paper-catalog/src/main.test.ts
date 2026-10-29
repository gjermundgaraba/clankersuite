// @vitest-environment node
import { describePages } from "./describe-pages.ts";
import { prerenderPaths } from "./entry.server.ts";
import { init, view } from "./main.ts";

describePages({ init, view, paths: prerenderPaths });
