import type { FlowNode } from "@/components/flow/types";
import { TILE_HEIGHT, TILE_WIDTH } from "@/layout/tile-constants";
import type { NodeFactory } from "@/layout/use-tiling-layout";

export type NodeType = "terminal" | "window" | "picker";

export function makeNodeFactory(
  type: NodeType,
  terminalCount: number
): NodeFactory {
  switch (type) {
    case "terminal":
      return (col, row) =>
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
            title: `Terminal ${terminalCount}`,
          },
        }) as FlowNode;
    case "window":
      return (col, row) =>
        ({
          id: `window-node-${crypto.randomUUID()}`,
          type: "window",
          position: { x: 0, y: 0 },
          draggable: false,
          data: { col, row, title: "Window", subtitle: "New window" },
        }) as FlowNode;
    case "picker":
      return (col, row) =>
        ({
          id: `picker-node-${crypto.randomUUID()}`,
          type: "picker",
          position: { x: 0, y: 0 },
          style: { width: TILE_WIDTH, height: TILE_HEIGHT },
          draggable: false,
          data: { col, row },
        }) as FlowNode;
    default:
      throw new Error(`Unsupported node type: ${type satisfies never}`);
  }
}
