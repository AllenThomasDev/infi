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
  // TODO: implement handlers for these commands
  // { key: "mod+z", command: "canvas.undo", label: "Undo" },
  // { key: "mod+shift+z", command: "canvas.redo", label: "Redo" },
  // { key: "mod+c", command: "canvas.copy", label: "Copy", when: "canvasFocus" },
  // { key: "mod+v", command: "canvas.paste", label: "Paste", when: "canvasFocus" },
  // { key: "mod+d", command: "canvas.duplicate", label: "Duplicate", when: "canvasFocus && nodeSelected" },
  {
    key: "mod+h",
    command: "tiling.createLeft",
    label: "New Terminal Column Left",
  },
  {
    key: "mod+l",
    command: "tiling.createRight",
    label: "New Terminal Column Right",
  },
  {
    key: "mod+k",
    command: "tiling.createUp",
    label: "New Terminal Above in Column",
  },
  {
    key: "mod+j",
    command: "tiling.createDown",
    label: "New Terminal Below in Column",
  },
  {
    key: "mod+shift+h",
    command: "tiling.insertLeft",
    label: "Insert Column Left",
  },
  {
    key: "mod+shift+l",
    command: "tiling.insertRight",
    label: "Insert Column Right",
  },
  {
    key: "mod+shift+k",
    command: "tiling.insertUp",
    label: "Insert Above in Column",
  },
  {
    key: "mod+shift+j",
    command: "tiling.insertDown",
    label: "Insert Below in Column",
  },
  { key: "mod+left", command: "tiling.focusLeft", label: "Focus Left" },
  { key: "mod+right", command: "tiling.focusRight", label: "Focus Right" },
  { key: "mod+up", command: "tiling.focusUp", label: "Focus Up" },
  { key: "mod+down", command: "tiling.focusDown", label: "Focus Down" },
  {
    key: "mod+shift+left",
    command: "tiling.moveLeft",
    label: "Move to Left Column",
  },
  {
    key: "mod+shift+right",
    command: "tiling.moveRight",
    label: "Move to Right Column",
  },
  { key: "mod+shift+up", command: "tiling.moveUp", label: "Move Up in Column" },
  {
    key: "mod+shift+down",
    command: "tiling.moveDown",
    label: "Move Down in Column",
  },
  { key: "mod+shift+t", command: "theme.toggle", label: "Toggle Theme" },
  { key: "mod+shift+p", command: "app.commandPalette" },
];
