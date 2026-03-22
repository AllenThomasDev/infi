import type { NodeTypes } from "@xyflow/react";
import type { LucideIcon } from "lucide-react";
import { AppWindow, Globe, Terminal } from "lucide-react";
import BrowserNode from "@/components/flow/browser-node";
import TerminalNode from "@/components/flow/terminal-node";
import type { FlowNode } from "@/components/flow/types";
import WindowNode from "@/components/flow/window-node";
import { TILE_HEIGHT, TILE_WIDTH } from "@/layout/tile-constants";
import PickerNode from "./picker-node";

interface PickerOptionDefinition {
  icon: LucideIcon;
  label: string;
}

interface NodeDefinition {
  create: (
    col: number,
    row: number,
    nodes: readonly FlowNode[]
  ) => FlowNode;
  picker?: PickerOptionDefinition;
}

export type NodeType = "browser" | "picker" | "terminal" | "window";

function nextNumber(nodes: readonly FlowNode[], prefix: string) {
  let max = 0;
  const pattern = new RegExp(`^${prefix} (\\d+)$`);
  for (const n of nodes) {
    const title = (n.data as { title?: string }).title;
    const m = title?.match(pattern);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return max + 1;
}

export const nodeRegistry: Record<NodeType, NodeDefinition> = {
  browser: {
    create: (col, row, nodes) =>
      ({
        id: `browser-node-${crypto.randomUUID()}`,
        type: "browser",
        position: { x: 0, y: 0 },
        style: { width: TILE_WIDTH, height: TILE_HEIGHT },
        draggable: false,
        data: {
          col,
          row,
          title: `Browser ${nextNumber(nodes, "Browser")}`,
          url: "https://google.com",
        },
      }) as FlowNode,
    picker: {
      icon: Globe,
      label: "Browser",
    },
  },
  terminal: {
    create: (col, row, nodes) =>
      ({
        id: `terminal-node-${crypto.randomUUID()}`,
        type: "terminal",
        position: { x: 0, y: 0 },
        style: { width: TILE_WIDTH, height: TILE_HEIGHT },
        draggable: false,
        data: {
          col,
          row,
          terminalId: `terminal-${crypto.randomUUID()}`,
          title: `Terminal ${nextNumber(nodes, "Terminal")}`,
        },
      }) as FlowNode,
    picker: {
      icon: Terminal,
      label: "Terminal",
    },
  },
  window: {
    create: (col, row, nodes) =>
      ({
        id: `window-node-${crypto.randomUUID()}`,
        type: "window",
        position: { x: 0, y: 0 },
        draggable: false,
        data: {
          col,
          row,
          title: `Window ${nextNumber(nodes, "Window")}`,
          subtitle: "New window",
        },
      }) as FlowNode,
    picker: {
      icon: AppWindow,
      label: "Window",
    },
  },
  picker: {
    create: (col, row) =>
      ({
        id: `picker-node-${crypto.randomUUID()}`,
        type: "picker",
        position: { x: 0, y: 0 },
        style: { width: TILE_WIDTH, height: TILE_HEIGHT },
        draggable: false,
        data: { col, row },
      }) as FlowNode,
  },
};

export const flowNodeTypes = {
  browser: BrowserNode,
  picker: PickerNode,
  terminal: TerminalNode,
  window: WindowNode,
} satisfies NodeTypes;

export const pickerNodeOptions = Object.entries(nodeRegistry).flatMap(
  ([type, definition]) =>
    definition.picker
      ? [
          {
            type: type as NodeType,
            icon: definition.picker.icon,
            label: definition.picker.label,
          },
        ]
      : []
);
