export const KEYBINDING_COMMANDS = [
  "canvas.zoomIn",
  "canvas.zoomOut",
  "canvas.fitView",
  "canvas.selectAll",
  "canvas.deleteSelected",
  "canvas.undo",
  "canvas.redo",
  "canvas.copy",
  "canvas.paste",
  "canvas.duplicate",
  "theme.toggle",
  "app.commandPalette",
] as const;

export type KeybindingCommand = (typeof KEYBINDING_COMMANDS)[number];

export interface KeybindingShortcut {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  modKey: boolean;
}

export interface KeybindingRule {
  key: string;
  command: KeybindingCommand;
  when?: string;
}

export type KeybindingWhenNode =
  | { type: "identifier"; name: string }
  | { type: "not"; node: KeybindingWhenNode }
  | { type: "and"; left: KeybindingWhenNode; right: KeybindingWhenNode }
  | { type: "or"; left: KeybindingWhenNode; right: KeybindingWhenNode };

export interface ResolvedKeybindingRule {
  command: KeybindingCommand;
  shortcut: KeybindingShortcut;
  whenAst?: KeybindingWhenNode;
}

export type ResolvedKeybindingsConfig = ResolvedKeybindingRule[];

export interface ShortcutMatchContext {
  canvasFocus: boolean;
  inputFocus: boolean;
  nodeSelected: boolean;
  [key: string]: boolean;
}

export const MAX_KEYBINDINGS_COUNT = 256;
export const MAX_WHEN_EXPRESSION_DEPTH = 64;
