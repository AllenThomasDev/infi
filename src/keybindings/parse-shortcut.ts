import type { KeybindingShortcut } from "./types";

function normalizeKeyToken(token: string): string {
  if (token === "space") {
    return " ";
  }
  if (token === "esc") {
    return "escape";
  }
  if (token === "left") {
    return "arrowleft";
  }
  if (token === "right") {
    return "arrowright";
  }
  if (token === "up") {
    return "arrowup";
  }
  if (token === "down") {
    return "arrowdown";
  }
  return token;
}

export function parseKeybindingShortcut(
  value: string
): KeybindingShortcut | null {
  const rawTokens = value
    .toLowerCase()
    .split("+")
    .map((token) => token.trim());
  const tokens = [...rawTokens];

  let trailingEmptyCount = 0;
  while (tokens[tokens.length - 1] === "") {
    trailingEmptyCount += 1;
    tokens.pop();
  }
  if (trailingEmptyCount > 0) {
    tokens.push("+");
  }

  if (tokens.some((token) => token.length === 0)) {
    return null;
  }
  if (tokens.length === 0) {
    return null;
  }

  let key: string | null = null;
  let metaKey = false;
  let ctrlKey = false;
  let shiftKey = false;
  let altKey = false;
  let modKey = false;

  for (const token of tokens) {
    switch (token) {
      case "cmd":
      case "meta":
        metaKey = true;
        break;
      case "ctrl":
      case "control":
        ctrlKey = true;
        break;
      case "shift":
        shiftKey = true;
        break;
      case "alt":
      case "option":
        altKey = true;
        break;
      case "mod":
        modKey = true;
        break;
      default: {
        if (key !== null) {
          return null;
        }
        key = normalizeKeyToken(token);
      }
    }
  }

  if (key === null) {
    return null;
  }
  return { key, metaKey, ctrlKey, shiftKey, altKey, modKey };
}
