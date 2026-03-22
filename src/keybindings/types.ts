export const KEYBINDING_COMMANDS = [
  "canvas.zoomIn",
  "canvas.zoomOut",
  "canvas.fitView",
  "canvas.selectAll",
  "canvas.deleteSelected",
  "tiling.createLeft",
  "tiling.createRight",
  "tiling.createUp",
  "tiling.createDown",
  "tiling.insertLeft",
  "tiling.insertRight",
  "tiling.insertUp",
  "tiling.insertDown",
  "tiling.focusLeft",
  "tiling.focusRight",
  "tiling.focusUp",
  "tiling.focusDown",
  "tiling.moveLeft",
  "tiling.moveRight",
  "tiling.moveUp",
  "tiling.moveDown",
  "theme.toggle",
  "app.commandPalette",
] as const;

export type KeybindingCommand = (typeof KEYBINDING_COMMANDS)[number];

export type CommandHandlerMap = Partial<Record<KeybindingCommand, () => void>>;

export interface KeybindingShortcut {
  altKey: boolean;
  ctrlKey: boolean;
  key: string;
  metaKey: boolean;
  modKey: boolean;
  shiftKey: boolean;
}

export interface KeybindingRule {
  command: KeybindingCommand;
  key: string;
  label?: string;
  when?: string;
}

export type KeybindingWhenNode =
  | { type: "identifier"; name: string }
  | { type: "not"; node: KeybindingWhenNode }
  | { type: "and"; left: KeybindingWhenNode; right: KeybindingWhenNode }
  | { type: "or"; left: KeybindingWhenNode; right: KeybindingWhenNode };

export interface ResolvedKeybindingRule {
  command: KeybindingCommand;
  label?: string;
  shortcut: KeybindingShortcut;
  whenAst?: KeybindingWhenNode;
}

export type ResolvedKeybindingsConfig = ResolvedKeybindingRule[];

export interface ShortcutMatchContext {
  canvasFocus: boolean;
  inputFocus: boolean;
  [key: string]: boolean;
}

export const MAX_KEYBINDINGS_COUNT = 256;
export const MAX_WHEN_EXPRESSION_DEPTH = 64;
