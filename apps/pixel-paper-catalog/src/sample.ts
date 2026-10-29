import { PasswordField } from "@gjermundgaraba/pixel-paper";
import type { History } from "@gjermundgaraba/pixel-paper";
import { Array, Option, Record, Schema } from "effect";

import type { CopyKey } from "./copies.ts";

export const SAMPLE_MOMENT = Date.UTC(2026, 2, 12, 14, 5);

export const SAMPLE_LINE =
  "Sample content: every name, number and key on this page is made up for the specimen.";

export const Status = Schema.Literals(["Queued", "Active", "Done"]);

export type Status = typeof Status.Type;

export const Item = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  group: Schema.String,
  status: Status,
  isMarked: Schema.Boolean,
  isBlocked: Schema.Boolean,
  maybeDue: Schema.Option(Schema.String),
  isLate: Schema.Boolean,
  maybeAge: Schema.Option(Schema.String),
});

export type Item = typeof Item.Type;

type ItemInput = Readonly<{
  id: string;
  title: string;
  group: string;
  status: Status;
  isMarked?: boolean;
  isBlocked?: boolean;
  due?: string;
  isLate?: boolean;
  age?: string;
}>;

const item = (input: ItemInput): Item => ({
  id: input.id,
  title: input.title,
  group: input.group,
  status: input.status,
  isMarked: input.isMarked ?? false,
  isBlocked: input.isBlocked ?? false,
  maybeDue: Option.fromNullishOr(input.due),
  isLate: input.isLate ?? false,
  maybeAge: Option.fromNullishOr(input.age),
});

export const GROUPS: ReadonlyArray<Readonly<{ id: string; name: string }>> = [
  { id: "ops", name: "Operations" },
  { id: "home", name: "Household" },
];

export const ITEMS: readonly Item[] = [
  item({
    id: "i1",
    title: "Renew the signing certificate",
    group: "ops",
    status: "Active",
    isMarked: true,
    due: "fri",
    age: "2d",
  }),
  item({
    id: "i2",
    title: "Move backups to the second region",
    group: "ops",
    status: "Queued",
    isBlocked: true,
    due: "12 oct",
  }),
  item({
    id: "i3",
    title: "Answer the supplier about the March invoice",
    group: "ops",
    status: "Queued",
    due: "yesterday",
    isLate: true,
  }),
  item({
    id: "i4",
    title: "Rotate the staging API keys",
    group: "ops",
    status: "Done",
    age: "5d",
  }),
  item({
    id: "i5",
    title: "Book the boiler service",
    group: "home",
    status: "Queued",
    due: "mon",
  }),
  item({
    id: "i6",
    title: "Sort the paperwork drawer",
    group: "home",
    status: "Active",
    age: "9d",
  }),
  item({
    id: "i7",
    title: "Return the borrowed ladder",
    group: "home",
    status: "Done",
  }),
];

export const Client = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  kind: Schema.String,
  grants: Schema.String,
  seen: Schema.String,
  uses: Schema.Finite,
  isOff: Schema.Boolean,
});

export type Client = typeof Client.Type;

export const CLIENTS: readonly Client[] = [
  {
    id: "c1",
    name: "build-runner",
    kind: "machine",
    grants: "read · write",
    seen: "4m ago",
    uses: 1204,
    isOff: false,
  },
  {
    id: "c2",
    name: "reporting",
    kind: "machine",
    grants: "read",
    seen: "2h ago",
    uses: 318,
    isOff: false,
  },
  {
    id: "c3",
    name: "desktop-app",
    kind: "public",
    grants: "read · write",
    seen: "yesterday",
    uses: 57,
    isOff: false,
  },
  {
    id: "c4",
    name: "old-importer",
    kind: "machine",
    grants: "read",
    seen: "90d ago",
    uses: 0,
    isOff: true,
  },
];

type Allowance = Readonly<{
  id: string;
  name: string;
  plan: string;
  used: number;
  limit: number;
  unit: string;
  resets: string;
  checked: string;
}>;

export const METERS: readonly Allowance[] = [
  {
    id: "m1",
    name: "Requests",
    plan: "standard plan",
    used: 41_200,
    limit: 50_000,
    unit: "requests",
    resets: "resets in 9 days",
    checked: "checked 3m ago",
  },
  {
    id: "m2",
    name: "Storage",
    plan: "standard plan",
    used: 12_800,
    limit: 50_000,
    unit: "MB",
    resets: "resets never",
    checked: "checked 3m ago",
  },
  {
    id: "m3",
    name: "Seats",
    plan: "team plan",
    used: 10,
    limit: 10,
    unit: "seats",
    resets: "resets on renewal",
    checked: "checked 1h ago",
  },
];

export const isNearLimit = (allowance: Allowance): boolean =>
  allowance.used >= allowance.limit * 0.8;

export const CHECKS: readonly History.Entry[] = [
  { id: "k1", at: ["3m"], who: ["Requests"], what: ["read 41,200 of 50,000"] },
  { id: "k2", at: ["3m"], who: ["Storage"], what: ["read 12,800 of 50,000"] },
  {
    id: "k3",
    at: ["1h"],
    who: ["Mail relay"],
    what: ["sign-in rejected"],
    isFailed: true,
  },
  { id: "k4", at: ["1h"], who: ["Seats"], what: ["read 10 of 10"] },
];

export const VERSIONS: readonly History.Entry[] = [
  {
    id: "v4",
    at: ["v4"],
    who: ["sam"],
    what: ["Split the rollout into two steps"],
    isCurrent: true,
  },
  { id: "v3", at: ["v3"], who: ["robin"], what: ["Add the rollback section"] },
  { id: "v2", at: ["v2"], who: ["sam"], what: ["First full draft"] },
  { id: "v1", at: ["v1"], who: ["sam"], what: ["Created"] },
];

export const PATCH = `--- a/rollout.md
+++ b/rollout.md
@@ -4,4 +4,5 @@
 2. Drain the old nodes.
-3. Switch traffic.
+3. Switch ten percent of traffic.
 4. Watch the error rate for an hour.
+5. Switch the rest.
`;

export const FILES: readonly string[] = [
  "service.toml",
  "hooks/before-deploy.sh",
  "hooks/after-deploy.sh",
  "templates/notice.txt",
  "README.md",
];

const FILE_BODIES: Record.ReadonlyRecord<string, string> = {
  "service.toml": `[service]
name = "sample-service"
region = "north"

[deploy]
steps = 2
window = "tue 06:00"
`,
  "hooks/before-deploy.sh": `#!/bin/sh
set -eu
echo "draining old nodes"
`,
  "hooks/after-deploy.sh": `#!/bin/sh
set -eu
echo "watching the error rate"
`,
  "templates/notice.txt": `The service is being updated between 06:00 and 07:00.
`,
  "README.md": `# sample-service

A made-up service for the specimen.
`,
};

export const fileBody = (path: string): string =>
  Option.getOrElse(
    Record.get(FILE_BODIES, path),
    () => "(an empty sample file)"
  );

export const SECRET = "pp_live_7Hq2mV9xLc4sT8wRz1kN5bYd3fGj6";

export const ISSUER: ReadonlyArray<
  Readonly<{ label: string; value: string; copyKey?: CopyKey }>
> = [
  {
    label: "Issuer",
    value: "https://auth.example.test",
    copyKey: "console-issuer",
  },
  {
    label: "Keys",
    value: "https://auth.example.test/keys",
    copyKey: "console-keys",
  },
  { label: "Algorithm", value: "EdDSA" },
  { label: "Rotates", value: "every 90 days" },
];

export const ASKING = {
  name: "Desktop notes",
  id: "desk_7Hq2mV9xLc4s",
  kind: "public · pkce",
  resource: "https://items.example.test/",
  returnTo: "http://127.0.0.1:47831/callback",
  scopes: [
    { scope: "items:read", what: "See every item and its history." },
    { scope: "items:write", what: "Change, move and remove items." },
  ],
  claims: `{
  "userinfo": {
    "name": { "essential": true }
  }
}`,
} as const;

export const TERMINAL_LINES: ReadonlyArray<
  Readonly<{ id: string; prompt: string; ink: string; text: string }>
> = [
  { id: "t1", prompt: "$ ", ink: "ink", text: "deploy --dry-run" },
  { id: "t2", prompt: "", ink: "term-cyan", text: "resolving 14 hosts" },
  { id: "t3", prompt: "", ink: "term-green", text: "✓ north-1  ready" },
  { id: "t4", prompt: "", ink: "term-green", text: "✓ north-2  ready" },
  {
    id: "t5",
    prompt: "",
    ink: "term-yellow",
    text: "! north-3  draining (2 sessions)",
  },
  { id: "t6", prompt: "", ink: "term-red", text: "✗ south-1  unreachable" },
  { id: "t7", prompt: "$ ", ink: "ink", text: "" },
];

export const sampleStrength = (password: string): PasswordField.Strength => {
  const score =
    Math.floor(password.length / 4) +
    (/[^a-z]/iu.test(password) ? 1 : 0) -
    (password.length < 8 ? 1 : 0);

  return Option.getOrElse(
    Array.findLast(
      PasswordField.Strength.literals,
      (strength) => strength <= score
    ),
    () => 0
  );
};

export type Room = Readonly<{
  id: string;
  name: string;
  meta: string;
  isLive: boolean;
}>;

export const ROOMS: readonly Room[] = [
  {
    id: "r1",
    name: "Release planning",
    meta: "3 here now · changed 4m ago",
    isLive: true,
  },
  {
    id: "r2",
    name: "Support rota",
    meta: "1 here now · changed 1h ago",
    isLive: true,
  },
  {
    id: "r3",
    name: "Second-region migration and the long tail of everything it left behind",
    meta: "nobody here · changed 6d ago",
    isLive: false,
  },
  {
    id: "r4",
    name: "Scratch",
    meta: "nobody here · changed 41d ago",
    isLive: false,
  },
];

export const TODAY = {
  requests: 41_200,
  requestsChange: 12,
  signIns: 318,
  signInsChange: -4,
  failed: 27,
  failedChange: 19,
  clients: 4,
} as const;
