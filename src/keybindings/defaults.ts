import type { KeybindingRule } from "./types";

export const DEFAULT_KEYBINDINGS: readonly KeybindingRule[] = [
  { key: "mod+=", command: "canvas.zoomIn" },
  { key: "mod+-", command: "canvas.zoomOut" },
  { key: "mod+0", command: "canvas.fitView" },
  { key: "mod+a", command: "canvas.selectAll", when: "canvasFocus" },
  {
    key: "backspace",
    command: "canvas.deleteSelected",
    when: "canvasFocus && !inputFocus",
  },
  {
    key: "delete",
    command: "canvas.deleteSelected",
    when: "canvasFocus && !inputFocus",
  },
  {
    key: "mod+g",
    command: "canvas.groupSelected",
    when: "canvasFocus && canGroupNodes && !inputFocus",
  },
  {
    key: "mod+shift+g",
    command: "canvas.ungroupSelected",
    when: "canvasFocus && canUngroupNodes && !inputFocus",
  },
  { key: "mod+z", command: "canvas.undo" },
  { key: "mod+shift+z", command: "canvas.redo" },
  { key: "mod+c", command: "canvas.copy", when: "canvasFocus" },
  { key: "mod+v", command: "canvas.paste", when: "canvasFocus" },
  {
    key: "mod+d",
    command: "canvas.duplicate",
    when: "canvasFocus && nodeSelected",
  },
  { key: "mod+j", command: "terminal.toggle" },
  { key: "mod+shift+l", command: "theme.toggle" },
  { key: "mod+k", command: "app.commandPalette" },
];
