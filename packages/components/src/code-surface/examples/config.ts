import { CodeSurface } from "@gjermundgaraba/components";
import type { Html, HtmlBuilder } from "foldkit/html";

const ROLLOUT = `# rollout
window = "Tue 09:00"
drain = true
batch = 4
notify = "ops"
rollback = "auto"
`;

export const view = <Message>(h: HtmlBuilder<Message>): Html =>
  CodeSurface.view({ label: "rollout.toml", body: [ROLLOUT] }, h);
