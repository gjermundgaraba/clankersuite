import { KeyHelp } from "@gjermundgaraba/components";
import type { StatusBar } from "@gjermundgaraba/components";

export const PALETTE_KEYS = "Mod+K";

export const SITE_KEY_NOTES: readonly StatusBar.KeyNote[] = [
  { keys: KeyHelp.HELP_KEYS, does: "keys" },
  { keys: PALETTE_KEYS, does: "commands" },
];
