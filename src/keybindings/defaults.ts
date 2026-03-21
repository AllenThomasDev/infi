import type { KeybindingRule } from "./types";

export const DEFAULT_KEYBINDINGS: readonly KeybindingRule[] = [
  { key: "mod+=", command: "canvas.zoomIn", label: "Zoom In" },
  { key: "mod+-", command: "canvas.zoomOut", label: "Zoom Out" },
  { key: "mod+0", command: "canvas.fitView", label: "Fit View" },
  {
    key: "mod+a",
    command: "canvas.selectAll",
    label: "Select All",
    when: "canvasFocus",
  },
  {
    key: "backspace",
    command: "canvas.deleteSelected",
    label: "Delete Selected",
    when: "canvasFocus && !inputFocus",
  },
  {
    key: "delete",
    command: "canvas.deleteSelected",
    label: "Delete Selected",
    when: "canvasFocus && !inputFocus",
  },
  {
    key: "mod+g",
    command: "canvas.groupSelected",
    label: "Group Selected",
    when: "canvasFocus && canGroupNodes && !inputFocus",
  },
  {
    key: "mod+shift+g",
    command: "canvas.ungroupSelected",
    label: "Ungroup Selected",
    when: "canvasFocus && canUngroupNodes && !inputFocus",
  },
  // TODO: implement handlers for these commands
  // { key: "mod+z", command: "canvas.undo", label: "Undo" },
  // { key: "mod+shift+z", command: "canvas.redo", label: "Redo" },
  // { key: "mod+c", command: "canvas.copy", label: "Copy", when: "canvasFocus" },
  // { key: "mod+v", command: "canvas.paste", label: "Paste", when: "canvasFocus" },
  // { key: "mod+d", command: "canvas.duplicate", label: "Duplicate", when: "canvasFocus && nodeSelected" },
  { key: "mod+j", command: "terminal.create", label: "New Terminal" },
  { key: "mod+shift+l", command: "theme.toggle", label: "Toggle Theme" },
  { key: "mod+k", command: "app.commandPalette" },
];
