import {
  Array,
  Effect,
  Match,
  Option,
  Predicate,
  Record,
  Schema,
  String,
  pipe,
} from "effect";
import type { KeySequence } from "foldkit/dom";

/** Which keyboard a key prints for: Apple's symbols (`⌘K`) or the spelled-out modifiers
 *  everyone else reads (`Ctrl+K`). `Mod` in a binding is Meta on Apple, Control elsewhere. */
export const KeyPlatform = Schema.Literals(["Apple", "Other"]);

export type KeyPlatform = typeof KeyPlatform.Type;

const APPLE_PLATFORM_PATTERN = /Mac|iPhone|iPad|iPod/u;

/** The key platform a user agent string names, the way `Dom.streamFromKeyBindings` resolves
 *  `Mod`, so a hint names the key the binding answers to. */
export const keyPlatformOf = (userAgent: string): KeyPlatform =>
  APPLE_PLATFORM_PATTERN.test(userAgent) ? "Apple" : "Other";

/** The reader's key platform, from the browser's user agent (`keyPlatformOf`). `Other` where
 *  there is no navigator, as during a server render. */
export const detectKeyPlatform: Effect.Effect<KeyPlatform> = Effect.sync(() =>
  typeof navigator === "undefined"
    ? "Other"
    : keyPlatformOf(navigator.userAgent)
);

type Modifier = "Control" | "Alt" | "Shift" | "Meta";

type Press = Readonly<{ modifiers: readonly Modifier[]; key: string }>;

const MODIFIER_ORDER: readonly Modifier[] = ["Control", "Alt", "Shift", "Meta"];

const APPLE_SYMBOL: Record.ReadonlyRecord<Modifier, string> = {
  Control: "⌃",
  Alt: "⌥",
  Shift: "⇧",
  Meta: "⌘",
};

const OTHER_PREFIX: Record.ReadonlyRecord<Modifier, string> = {
  Control: "Ctrl+",
  Alt: "Alt+",
  Shift: "Shift+",
  Meta: "Meta+",
};

const KEY_NAMES: Record.ReadonlyRecord<string, string> = {
  arrowdown: "↓",
  arrowup: "↑",
  arrowleft: "←",
  arrowright: "→",
  plus: "+",
  space: "Space",
};

const toModifier =
  (platform: KeyPlatform) =>
  (token: string): Option.Option<Modifier> =>
    Match.value(String.toLowerCase(token)).pipe(
      Match.withReturnType<Option.Option<Modifier>>(),
      Match.when("mod", () =>
        Option.some(platform === "Apple" ? "Meta" : "Control")
      ),
      Match.when("control", () => Option.some("Control")),
      Match.when("alt", () => Option.some("Alt")),
      Match.when("shift", () => Option.some("Shift")),
      Match.when("meta", () => Option.some("Meta")),
      Match.orElse(() => Option.none())
    );

const parsePress = (press: string, platform: KeyPlatform): Press => {
  const tokens = pipe(press, String.split("+"), Array.map(String.trim));
  const [modifierTokens, key] = Array.unappend(tokens);

  return {
    modifiers: Array.getSomes(Array.map(modifierTokens, toModifier(platform))),
    key,
  };
};

const isCharacter = (key: string): boolean => key.length === 1;

const keyName = (key: string, hasModifier: boolean): string =>
  Option.match(Record.get(KEY_NAMES, String.toLowerCase(key)), {
    onSome: (name) => name,
    onNone: () => {
      if (!isCharacter(key)) {
        return key;
      } else if (hasModifier) {
        return String.toUpperCase(key);
      }

      return String.toLowerCase(key);
    },
  });

const pressLabel = (press: string, platform: KeyPlatform): string => {
  const { modifiers, key } = parsePress(press, platform);

  const isShiftedCharacter =
    isCharacter(key) &&
    Array.contains(modifiers, "Shift") &&
    Array.length(modifiers) === 1;

  if (isShiftedCharacter) {
    return String.toUpperCase(key);
  }

  const orderedModifiers = Array.filter(MODIFIER_ORDER, (modifier) =>
    Array.contains(modifiers, modifier)
  );

  const prefix = Array.join(
    Array.map(orderedModifiers, (modifier) =>
      platform === "Apple" ? APPLE_SYMBOL[modifier] : OTHER_PREFIX[modifier]
    ),
    ""
  );

  return `${prefix}${keyName(key, Array.isReadonlyArrayNonEmpty(orderedModifiers))}`;
};

export const pressesOf = (keys: KeySequence): readonly string[] =>
  Predicate.isString(keys) ? [keys] : keys;

/**
 * A key binding as the help and the key hints print it. Takes the same strings
 * `Dom.streamFromKeyBindings` matches: `"Mod+K"` prints `⌘K` on Apple and `Ctrl+K` elsewhere,
 * arrows print as arrows, a plain letter prints in lower case (`"G"` is `g`), and Shift with a
 * lone character prints the character it types (`"Shift+G"` is `G`, `"Shift+?"` is `?`). A
 * sequence of characters reads as Vim writes it (`["G", "G"]` is `gg`); a sequence with a
 * named key keeps its spaces.
 */
export const keyLabel = (keys: KeySequence, platform: KeyPlatform): string => {
  const labels = Array.map(pressesOf(keys), (press) =>
    pressLabel(press, platform)
  );

  return Array.every(labels, isCharacter)
    ? Array.join(labels, "")
    : Array.join(labels, " ");
};
